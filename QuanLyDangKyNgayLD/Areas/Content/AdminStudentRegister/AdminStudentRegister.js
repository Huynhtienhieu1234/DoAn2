

// ==================== CÁC HÀM GLOBAL (CÓ THỂ GỌI TỪ ONCLICK) ====================

// ============= UTILITY FUNCTIONS GLOBAL =============
function showModal(id) {
    bootstrap.Modal.getOrCreateInstance(document.getElementById(id)).show();
}

function hideModal(id) {
    bootstrap.Modal.getInstance(document.getElementById(id))?.hide();
}

function showLoading(btn, txt) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>${txt}`;
}

function resetButton(btn, txt) {
    btn.disabled = false;
    btn.innerHTML = txt;
}

function debounce(fn, wait) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

// Hàm hiển thị modal xác nhận tùy chỉnh
function showCustomConfirmModal(title, message, onConfirm) {
    const confirmTitle = document.getElementById("confirmTitle");
    const confirmMessage = document.getElementById("confirmMessage");
    const confirmOkBtn = document.getElementById("confirmOkBtn");

    // Cập nhật nội dung
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;

    // Xóa event listener cũ bằng cách clone element
    const newOkBtn = confirmOkBtn.cloneNode(true);
    confirmOkBtn.parentNode.replaceChild(newOkBtn, confirmOkBtn);

    // Gắn event listener mới
    newOkBtn.addEventListener("click", function () {
        hideModal("customConfirmModal");
        if (typeof onConfirm === "function") {
            onConfirm();
        }
    });

    // Hiển thị modal
    showModal("customConfirmModal");
}

// Hàm khôi phục sinh viên
function restoreStudent(mssv) {
    showCustomConfirmModal(
        "Khôi phục sinh viên",
        `Bạn có chắc muốn khôi phục sinh viên này?`,
        function () {
            const fd = new FormData();
            fd.append("id", mssv);

            fetch("/Admin/AdminStudent/RestoreAjax", { method: "POST", body: fd })
                .then(r => r.json())
                .then(d => {
                    showToast(d.success ? "Khôi phục thành công!" : d.message, d.success ? "success" : "error");
                    if (d.success) {
                        loadDeletedStudents();
                        if (typeof loadStudents === "function") {
                            loadStudents(1);
                        }
                    }
                })
                .catch(err => {
                    console.error("Lỗi khi khôi phục:", err);
                    showToast("Lỗi server: " + err.message, "error");
                });
        }
    );
}

// Hàm xóa hẳn sinh viên
function deletePermanent(mssv) {
    showCustomConfirmModal(
        "Xóa vĩnh viễn sinh viên",
        `Bạn có chắc muốn xóa hẳn sinh viên này? Hành động này không thể hoàn tác!`,
        function () {
            const fd = new FormData();
            fd.append("id", mssv);

            fetch("/Admin/AdminStudent/DeletePermanentAjax", { method: "POST", body: fd })
                .then(r => r.json())
                .then(d => {
                    showToast(d.success ? "Đã xóa hẳn!" : d.message, d.success ? "success" : "error");
                    if (d.success) loadDeletedStudents();
                })
                .catch(err => {
                    console.error("Lỗi khi xóa hẳn:", err);
                    showToast("Lỗi server: " + err.message, "error");
                });
        }
    );
}

// Hàm hiển thị toast (dùng chung cho cả onclick lẫn các sự kiện khác)
function showToast(msg, type = "info") {
    if (window.showToast) window.showToast(msg, type);
    else alert(msg);
}

// Hàm load danh sách sinh viên đã xóa - ĐƯỢC DI CHUYỂN RA NGOÀI
function loadDeletedStudents() {
    const tbody = document.getElementById("deletedStudentsTableBody");
    if (!tbody) return;

    tbody.innerHTML = `
        <tr><td colspan="6" class="text-center text-muted py-4">Đang tải dữ liệu...</td></tr>
    `;

    fetch("/Admin/AdminStudent/GetDeletedList")
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.text();
        })
        .then(text => {
            try {
                const data = JSON.parse(text);

                if (!Array.isArray(data) || data.length === 0) {
                    tbody.innerHTML = `
                        <tr><td colspan="6" class="text-center text-muted py-4">
                            <i class="fas fa-inbox me-2"></i>Không có sinh viên nào đã xóa.
                        </td></tr>
                    `;
                    return;
                }

                tbody.innerHTML = "";
                data.forEach((sv, index) => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td class="fw-medium">${index + 1}</td>
                        <td><span class="badge bg-secondary">${sv.MSSV}</span></td>
                        <td class="fw-medium">${sv.HoTen ?? "Chưa có"}</td>
                        <td><span class="badge bg-info text-dark">${sv.Lop ?? "Chưa có"}</span></td>
                        <td><small class="text-muted">${sv.Deleted_at}</small></td>
                        <td>
                            <div class="d-flex gap-2">
                                <button class="btn btn-sm btn-success d-flex align-items-center px-3 py-2 rounded-3 shadow-sm"
                                        onclick="restoreStudent('${sv.MSSV}')"
                                        title="Khôi phục sinh viên này">
                                    <i class="fas fa-undo-alt me-2"></i>
                                    <span>Khôi phục</span>
                                </button>
                                <button class="btn btn-sm btn-danger d-flex align-items-center px-3 py-2 rounded-3 shadow-sm"
                                        onclick="deletePermanent('${sv.MSSV}')"
                                        title="Xóa vĩnh viễn khỏi hệ thống">
                                    <i class="fas fa-trash-alt me-2"></i>
                                    <span>Xóa hẳn</span>
                                </button>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            } catch (parseErr) {
                console.error("Phản hồi không phải JSON:", text);
                tbody.innerHTML = `
                    <tr><td colspan="6" class="text-center text-danger py-4">
                        <i class="fas fa-exclamation-triangle me-2"></i>Server trả về dữ liệu không hợp lệ.
                    </td></tr>
                `;
            }
        })
        .catch(err => {
            console.error("Lỗi khi tải danh sách đã xóa:", err);
            tbody.innerHTML = `
                <tr><td colspan="6" class="text-center text-danger py-4">
                    <i class="fas fa-exclamation-circle me-2"></i>Lỗi khi tải dữ liệu (${err.message}).
                </td></tr>
            `;
        });
}

// ==================== KHI TRANG TẢI XONG ====================

document.addEventListener("DOMContentLoaded", function () {
    let currentDeleteMSSV = null;
    let currentPage = 1;
    const pageSize = 10;
    let isLoading = false;

    // Biến cache và quản lý state cho hệ thống lọc
    let khoaLopCache = {};
    let currentFilterState = {
        khoa: '',
        search: ''
    };

    // Mapping tên khoa theo giá trị
    const khoaMapping = {
        "0": "Tất cả",
        "1": "Công nghệ và kỹ thuật",
        "2": "Khoa Ngoại ngữ",
        "3": "Khoa Kinh tế - Luật",
        "4": "Nông nghiệp, Tài nguyên và Môi trường",
        "5": "Văn hóa - Du lịch và Công tác xã hội",
        "6": "Sư phạm Toán - Tin",
        "7": "Sư phạm Khoa học tự nhiên",
        "8": "Sư phạm Khoa học xã hội",
        "9": "Giáo dục Tiểu học - Mầm non",
        "10": "Giáo dục Thể chất - Sư phạm Nghệ thuật"
    };

    setupEventListeners();
    loadStudents();
    initFilterSystem();

    function setupEventListeners() {
        // === NÚT TRÊN THANH CÔNG CỤ ===
        document.getElementById("btnAdd")?.addEventListener("click", () => showModal("createStudentModal"));

        document.getElementById("btnViewDeleted")?.addEventListener("click", () => {
            showModal("deletedStudentsModal");
            loadDeletedStudents();
        });

  

        // Form xử lý
        document.getElementById("createStudentForm")?.addEventListener("submit", handleCreateSubmit);
        document.getElementById("editStudentForm")?.addEventListener("submit", handleEditSubmit);
        document.getElementById("confirmDeleteStudentBtn")?.addEventListener("click", handleConfirmDelete);
    

        // ============= LỌC THEO KHOA + TÌM KIẾM - TỐI ƯU =============
        const roleFilter = document.getElementById("roleFilter");
        if (roleFilter) {
            roleFilter.addEventListener("change", function () {
                handleFilterChange();
            });
        }

        const searchBox = document.getElementById("searchBox");
        if (searchBox) {
            searchBox.addEventListener("input", debounce(() => {
                handleSearchChange();
            }, 400));
        }

        // Thêm nút xóa lọc
        addClearFilterButton();

        // Xử lý nút trong bảng
        document.getElementById("studentTableBody")?.addEventListener("click", function (e) {
            const btn = e.target.closest("button");
            if (!btn) return;
            if (btn.classList.contains("btn-edit-student")) handleEdit.call(btn);
            else if (btn.classList.contains("btn-delete-student")) handleDelete.call(btn);
            else if (btn.classList.contains("btn-detail-student")) handleDetail.call(btn);
        });
    }

    // ============= HIỆU ỨNG LOADING =============
    function showTableLoading() {
        if (isLoading) return;
        isLoading = true;

        const tbody = document.getElementById("studentTableBody");
        const loadingOverlay = document.getElementById("loadingOverlay");

        tbody.classList.add('loading');

        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
        }

        setTimeout(() => {
            tbody.style.opacity = '0.3';
            tbody.style.filter = 'blur(2px)';
        }, 50);
    }

    function hideTableLoading() {
        isLoading = false;

        const tbody = document.getElementById("studentTableBody");
        const loadingOverlay = document.getElementById("loadingOverlay");

        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
        }

        tbody.style.opacity = '1';
        tbody.style.filter = 'none';
        tbody.classList.remove('loading');
    }

    // ============= THÊM MỚI =============
    document.getElementById('createStudentModal')?.addEventListener('show.bs.modal', function () {
        const createKhoa = document.getElementById("createKhoa");
        if (createKhoa) createKhoa.value = "";

        const lopSelect = document.getElementById("createLop");
        if (lopSelect) {
            lopSelect.innerHTML = '<option value="">-- Chọn lớp --</option>';
            lopSelect.disabled = true;
        }

        const createNgaySinh = document.getElementById("createNgaySinh");
        if (createNgaySinh) createNgaySinh.value = "";

        const createGioiTinh = document.querySelector("select[name='GioiTinh']");
        if (createGioiTinh) createGioiTinh.value = "Nam";

        const createMSSV = document.querySelector("input[name='MSSV']");
        if (createMSSV) createMSSV.value = "";

        const createHoTen = document.querySelector("input[name='HoTen']");
        if (createHoTen) createHoTen.value = "";

        const createQueQuan = document.querySelector("input[name='QueQuan']");
        if (createQueQuan) createQueQuan.value = "";

        const createEmail = document.querySelector("input[name='Email']");
        if (createEmail) createEmail.value = "";

        const createSDT = document.querySelector("input[name='SoDienThoaiSinhVien']");
        if (createSDT) createSDT.value = "";
    });

    const createKhoaElement = document.getElementById("createKhoa");
    if (createKhoaElement) {
        createKhoaElement.addEventListener("change", function () {
            const khoaId = this.value;
            const lopSelect = document.getElementById("createLop");
            loadLopByKhoa(khoaId, lopSelect, null, true);
        });
    }

    function isValidEmail(email) {
        if (!email) return true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function isValidDateDDMMYYYY(dateString) {
        if (!dateString) return true;

        const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        const match = dateString.match(regex);

        if (!match) return false;

        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);

        if (month < 1 || month > 12) return false;

        const daysInMonth = new Date(year, month, 0).getDate();
        if (day < 1 || day > daysInMonth) return false;

        const currentYear = new Date().getFullYear();
        if (year < 1900 || year > currentYear + 1) return false;

        return true;
    }

    function convertDDMMYYYYtoYYYYMMDD(dateString) {
        if (!dateString) return "";

        const parts = dateString.split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dateString;
    }

    const createMSSVElement = document.querySelector("input[name='MSSV']");
    if (createMSSVElement) {
        createMSSVElement.addEventListener("input", function (e) {
            this.value = this.value.replace(/\D/g, '');
        });
    }

    const createSDTElement = document.querySelector("input[name='SoDienThoaiSinhVien']");
    if (createSDTElement) {
        createSDTElement.addEventListener("input", function (e) {
            this.value = this.value.replace(/\D/g, '');

            if (this.value.length > 10) {
                this.value = this.value.slice(0, 10);
            }
        });
    }

    const createNgaySinhElement = document.getElementById("createNgaySinh");
    if (createNgaySinhElement) {
        createNgaySinhElement.addEventListener("input", function (e) {
            let value = this.value.replace(/\D/g, '');

            if (value.length > 2 && value.length <= 4) {
                value = value.substring(0, 2) + '/' + value.substring(2);
            } else if (value.length > 4) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4) + '/' + value.substring(4, 8);
            }

            this.value = value;
        });
    }

    const createStudentForm = document.getElementById("createStudentForm");
    if (createStudentForm) {
        createStudentForm.addEventListener("keypress", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
                const submitBtn = this.querySelector("button[type='submit']");
                if (submitBtn) {
                    submitBtn.click();
                }
            }
        });
    }

    function handleCreateSubmit(e) {
        e.preventDefault();
        const form = this;
        const btn = form.querySelector("button[type=submit]");

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const mssvInput = document.querySelector("input[name='MSSV']");
        const hoTenInput = document.querySelector("input[name='HoTen']");
        const khoaSelect = document.getElementById("createKhoa");
        const lopSelect = document.getElementById("createLop");

        const mssv = mssvInput?.value.trim();
        const hoTen = hoTenInput?.value.trim();
        const khoaId = khoaSelect?.value;
        const lopId = lopSelect?.value;

        if (!mssv) {
            showToast("Vui lòng nhập MSSV!", "error");
            mssvInput?.focus();
            return;
        }

        if (!hoTen) {
            showToast("Vui lòng nhập họ tên!", "error");
            hoTenInput?.focus();
            return;
        }

        if (!khoaId) {
            showToast("Vui lòng chọn khoa!", "error");
            khoaSelect?.focus();
            return;
        }

        if (!lopId) {
            showToast("Vui lòng chọn lớp!", "error");
            lopSelect?.focus();
            return;
        }

        const ngaySinhInput = document.getElementById("createNgaySinh");
        const ngaySinh = ngaySinhInput?.value.trim();
        if (ngaySinh && !isValidDateDDMMYYYY(ngaySinh)) {
            showToast("Ngày sinh không hợp lệ! Vui lòng nhập đúng định dạng dd/MM/yyyy", "error");
            ngaySinhInput?.focus();
            return;
        }

        const emailInput = document.querySelector("input[name='Email']");
        const email = emailInput?.value.trim();
        if (email && !isValidEmail(email)) {
            showToast("Email không hợp lệ!", "error");
            emailInput?.focus();
            return;
        }

        showLoading(btn, "Đang lưu...");

        const fd = new FormData(form);

        if (ngaySinh) {
            fd.set("NgaySinh", convertDDMMYYYYtoYYYYMMDD(ngaySinh));
        }

        fetch("/Admin/AdminStudent/CreateAjax", {
            method: "POST",
            body: fd
        })
            .then(r => {
                if (!r.ok) {
                    throw new Error(`HTTP ${r.status}: ${r.statusText}`);
                }
                return r.json();
            })
            .then(d => {
                if (d.success) {
                    hideModal("createStudentModal");
                    showToast(d.message || "Thêm sinh viên thành công!", "success");
                    loadStudents();
                } else {
                    showToast(d.message || "Thêm thất bại!", "error");

                    if (d.message && d.message.includes("MSSV")) {
                        mssvInput?.focus();
                    }
                }
            })
            .catch(error => {
                console.error("Lỗi server:", error);
                showToast("Lỗi kết nối đến server! Vui lòng thử lại.", "error");
            })
            .finally(() => {
                resetButton(btn, "Lưu");
            });
    }

    // ============= XÓA =============
    function handleDelete() {
        currentDeleteMSSV = this.dataset.id;
        const row = this.closest("tr");
        document.getElementById("deleteStudentText").textContent =
            `Xóa sinh viên "${row.cells[2].textContent.trim()}" (MSSV: ${row.cells[1].textContent.trim()})?`;
        showModal("deleteStudentModal");
    }

    function handleConfirmDelete() {
        const btn = this;
        showLoading(btn, "Đang xóa...");

        const fd = new FormData();
        fd.append("id", currentDeleteMSSV);

        fetch("/Admin/AdminStudent/DeleteAjax", { method: "POST", body: fd })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                hideModal("deleteStudentModal");
                if (data.success) {
                    showToast("Xóa thành công!", "success");
                    loadStudents(currentPage);
                } else {
                    showToast(data.message || "Có lỗi xảy ra!", "error");
                }
            })
            .catch(err => {
                console.error("Lỗi khi xóa:", err);
                hideModal("deleteStudentModal");
                showToast("Lỗi kết nối hoặc server: " + err.message, "error");
            })
            .finally(() => resetButton(btn, "Xác nhận xóa"));
    }

    // ============= CHỈNH SỬA =============
    function parseJsonDate(jsonDate) {
        const timestamp = parseInt(jsonDate.replace(/[^0-9]/g, ""), 10);
        return new Date(timestamp);
    }

    function formatDateToDMY(date) {
        if (!date || isNaN(date.getTime())) return "";
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    function convertDMYtoYMD(dmy) {
        const parts = dmy.split("/");
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
        return dmy;
    }

    document.getElementById("editKhoa")?.addEventListener("change", function () {
        const khoaId = this.value;
        const lopSelect = document.getElementById("editLop");
        loadLopByKhoa(khoaId, lopSelect);
    });

    document.getElementById('editStudentModal')?.addEventListener('show.bs.modal', function () {
        const editLop = document.getElementById("editLop");
        if (editLop) {
            editLop.removeAttribute("data-old-value");
        }
    });

    function handleEdit() {
        const d = this.dataset;
        console.log("Dataset khi edit:", d);

        document.getElementById("editMSSV").value = d.id || "";
        document.getElementById("editHoTen").value = d.hoten || "";
        document.getElementById("editGioiTinh").value = d.gioitinh || "Nam";
        document.getElementById("editQueQuan").value = d.quequan || "";
        document.getElementById("editEmail").value = d.email || "";
        document.getElementById("editSDT").value = d.sdt || "";
        document.getElementById("editKhoa").value = d.khoa || "";

        // Ngày sinh hiển thị dd/MM/yyyy
        const editNgaySinh = document.getElementById("editNgaySinh");
        if (editNgaySinh && d.ngaysinh) {
            let date = null;
            if (d.ngaysinh.includes("/Date(")) {
                date = parseJsonDate(d.ngaysinh);
            } else {
                date = new Date(d.ngaysinh);
            }
            editNgaySinh.value = formatDateToDMY(date);
        }

        // Load lớp theo khoa - TỐI ƯU
        const lopSelect = document.getElementById("editLop");
        const khoaId = d.khoa;

        if (lopSelect) {
            lopSelect.innerHTML = '<option value="">-- Chọn lớp --</option>';

            if (khoaId && khoaId !== "undefined") {
                // Đặt giá trị lớp cũ vào data attribute
                if (d.lop && d.lop !== "undefined") {
                    lopSelect.setAttribute("data-old-value", d.lop);
                }

                // Load danh sách lớp
                loadLopByKhoa(khoaId, lopSelect, d.lop);
            } else {
                // Nếu không có khoa, disable dropdown lớp
                lopSelect.disabled = true;
                const opt = document.createElement("option");
                opt.value = "";
                opt.textContent = "Vui lòng chọn khoa trước";
                opt.disabled = true;
                lopSelect.appendChild(opt);
            }
        }

        showModal("editStudentModal");
    }

    function handleEditSubmit(e) {
        e.preventDefault();

        const form = this;
        const btn = form.querySelector("button[type=submit]");
        const formData = new FormData(form);

        // ===== Kiểm tra ngày sinh =====
        const ngaySinhInput = document.getElementById("editNgaySinh");
        let ngaySinhValue = "";

        if (ngaySinhInput && ngaySinhInput.value) {
            const val = ngaySinhInput.value.trim();
            if (val.includes("/")) {
                ngaySinhValue = convertDMYtoYMD(val); // dd/MM/yyyy → yyyy-MM-dd
            } else {
                ngaySinhValue = val;
            }

            const date = new Date(ngaySinhValue);
            if (isNaN(date.getTime())) {
                showToast("Ngày sinh không hợp lệ!", "error");
                ngaySinhInput.focus();
                return;
            }
        }

        // ===== Kiểm tra số điện thoại =====
        const sdtInput = document.getElementById("editSDT");
        if (sdtInput && sdtInput.value) {
            const phoneRegex = /^\d{10}$/;
            if (!phoneRegex.test(sdtInput.value.trim())) {
                showToast("Số điện thoại phải có đúng 10 chữ số!", "error");
                sdtInput.focus();
                return;
            }
        }

        showLoading(btn, "Đang lưu...");

        // Tạo FormData mới với dữ liệu đã xử lý
        const fd = new FormData();
        for (let [key, value] of formData.entries()) {
            fd.append(key, value);
        }
        if (ngaySinhValue) {
            fd.set("NgaySinh", ngaySinhValue);
        }

        // ===== Gửi request =====
        fetch("/Admin/AdminStudent/EditAjax", {
            method: "POST",
            body: fd
        })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                return response.json();
            })
            .then(data => {
                console.log("Phản hồi từ server:", data);

                if (data.success) {
                    hideModal("editStudentModal");
                    showToast("Cập nhật thành công!", "success");
                    loadStudents(currentPage);
                } else {
                    showToast(data.message || "Có lỗi xảy ra!", "error");
                }
            })
            .catch(err => {
                console.error("Lỗi khi gửi request:", err);
                showToast("Có lỗi xảy ra: " + err.message, "error");
            })
            .finally(() => {
                resetButton(btn, "Lưu thay đổi");
            });
    }

    // ============= CHI TIẾT SINH VIÊN =============
    function handleDetail() {
        const mssv = this.dataset.id;
        const detailModal = document.getElementById("detailStudentModal");
        const modalBody = detailModal.querySelector('.modal-body');

        // Hiển thị loading
        modalBody.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-wave mx-auto mb-3">
                <div></div><div></div><div></div>
            </div>
            <div class="text-muted">Đang tải thông tin sinh viên...</div>
        </div>
    `;

        showModal("detailStudentModal");

        // Gọi API lấy chi tiết
        fetch(`/Admin/AdminStudent/DetailsAjax?id=${mssv}`)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then(data => {
                if (!data.success || !data.data) {
                    throw new Error(data.message || "Không thể tải thông tin sinh viên");
                }

                const sv = data.data;
                const formattedNgaySinh = sv.NgaySinh || "-";

                // Hiển thị thông tin chi tiết + nút chỉnh sửa
                modalBody.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label class="form-label fw-bold text-primary">MSSV:</label>
                            <div class="bg-light p-2 rounded">${sv.MSSV || "-"}</div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold text-primary">Họ tên:</label>
                            <div class="bg-light p-2 rounded">${sv.HoTen || "-"}</div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold text-primary">Ngày sinh:</label>
                            <div class="bg-light p-2 rounded">${formattedNgaySinh}</div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold text-primary">Giới tính:</label>
                            <div class="bg-light p-2 rounded">${sv.GioiTinh || "-"}</div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label class="form-label fw-bold text-primary">Quê quán:</label>
                            <div class="bg-light p-2 rounded">${sv.QueQuan || "-"}</div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold text-primary">Email:</label>
                            <div class="bg-light p-2 rounded">${sv.Email || "-"}</div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold text-primary">Số điện thoại:</label>
                            <div class="bg-light p-2 rounded">${sv.SoDienThoaiSinhVien || "-"}</div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold text-primary">Lớp:</label>
                            <div class="bg-light p-2 rounded">${sv.Lop || "Chưa có"}</div>
                        </div>
                    </div>
                </div>
                <div class="text-end mt-3">
                    <button type="button" class="btn btn-secondary me-2" data-bs-dismiss="modal">Đóng</button>
                    <button type="button" class="btn btn-primary" id="btnEditDetail">
                        <i class="fa fa-edit me-1"></i> Chỉnh sửa
                    </button>
                </div>
            `;

                // Gắn sự kiện cho nút Chỉnh sửa
                const btnEdit = document.getElementById("btnEditDetail");
                if (btnEdit) {
                    btnEdit.onclick = function () {
                        hideModal("detailStudentModal");

                        // Điền dữ liệu vào modal chỉnh sửa
                        document.getElementById("editMSSV").value = sv.MSSV || "";
                        document.getElementById("editHoTen").value = sv.HoTen || "";
                        document.getElementById("editNgaySinh").value = sv.NgaySinh || "";
                        document.getElementById("editGioiTinh").value = sv.GioiTinh || "Nam";
                        document.getElementById("editQueQuan").value = sv.QueQuan || "";
                        document.getElementById("editEmail").value = sv.Email || "";
                        document.getElementById("editSDT").value = sv.SoDienThoaiSinhVien || "";
                        document.getElementById("editKhoa").value = sv.Khoa || "";
                        document.getElementById("editLop").value = sv.Lop || "";

                        // Mở modal chỉnh sửa
                        showModal("editStudentModal");
                    };
                }
            })
            .catch(err => {
                console.error("Lỗi khi tải chi tiết sinh viên:", err);
                modalBody.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${err.message || "Lỗi kết nối khi tải thông tin"}
                </div>
            `;
            });
    }
   
    // ============= HỆ THỐNG LỌC TỐI ƯU =============
    function handleFilterChange() {
        const roleFilter = document.getElementById("roleFilter");
        if (!roleFilter) return;

        currentPage = 1;
        currentFilterState.khoa = roleFilter.value;
        saveFilterState();
        showTableLoading();
        loadStudents();
        updateFilterUI();
    }

    function handleSearchChange() {
        const searchBox = document.getElementById("searchBox");
        if (!searchBox) return;

        currentPage = 1;
        currentFilterState.search = searchBox.value.trim();
        saveFilterState();
        showTableLoading();
        loadStudents();
        updateFilterUI();
    }

    function saveFilterState() {
        const filterState = {
            khoa: currentFilterState.khoa || "0",
            search: currentFilterState.search,
            page: currentPage,
            timestamp: Date.now()
        };

        localStorage.setItem('studentFilterState', JSON.stringify(filterState));
        updateURLParams();
    }

    function restoreFilterState() {
        try {
            const saved = JSON.parse(localStorage.getItem('studentFilterState') || '{}');
            const roleFilter = document.getElementById("roleFilter");
            const searchBox = document.getElementById("searchBox");

            if (saved.khoa !== undefined && roleFilter) {
                roleFilter.value = saved.khoa || "0";
                currentFilterState.khoa = saved.khoa || "0";
            } else {
                currentFilterState.khoa = "0";
            }

            if (saved.search !== undefined && searchBox) {
                searchBox.value = saved.search;
                currentFilterState.search = saved.search;
            }

            if (saved.page) {
                currentPage = parseInt(saved.page);
            }
        } catch (e) {
            console.log("Không thể khôi phục trạng thái lọc:", e);
            currentFilterState.khoa = "0";
        }
    }

    function updateURLParams() {
        const params = new URLSearchParams(window.location.search);

        // SỬA 1: Kiểm tra !== "0" thay vì !== ""
        if (currentFilterState.khoa && currentFilterState.khoa !== "0") {
            params.set('khoa', currentFilterState.khoa);
        } else {
            params.delete('khoa');
        }

        if (currentFilterState.search) {
            params.set('search', currentFilterState.search);
        } else {
            params.delete('search');
        }

        if (currentPage > 1) {
            params.set('page', currentPage);
        } else {
            params.delete('page');
        }

        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, '', newUrl);
    }

    function loadLopByKhoa(khoaId, targetSelect, selectedLopId = null, isCreateModal = false) {
        if (!targetSelect) return;

        // Reset dropdown
        targetSelect.innerHTML = '<option value="">-- Chọn lớp --</option>';
        targetSelect.disabled = true;

        // SỬA 2: Kiểm tra !== "0" thay vì !== ""
        if (!khoaId || khoaId === "" || khoaId === "0") {
            if (isCreateModal) {
                const opt = document.createElement("option");
                opt.value = "";
                opt.textContent = "Vui lòng chọn khoa";
                opt.disabled = true;
                targetSelect.appendChild(opt);
            }
            return;
        }

        // Kiểm tra cache trước
        if (khoaLopCache[khoaId]) {
            populateLopSelect(targetSelect, khoaLopCache[khoaId], selectedLopId);
            targetSelect.disabled = false;
            return;
        }

        // Hiển thị loading
        const loadingOption = document.createElement("option");
        loadingOption.value = "";
        loadingOption.textContent = "Đang tải danh sách lớp...";
        loadingOption.disabled = true;
        targetSelect.appendChild(loadingOption);

        fetch(`/Admin/AdminStudent/GetLopByKhoa?khoaId=${encodeURIComponent(khoaId)}`)
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then(data => {
                // Lưu vào cache
                khoaLopCache[khoaId] = data;
                populateLopSelect(targetSelect, data, selectedLopId);
                targetSelect.disabled = false;
            })
            .catch(error => {
                console.error("Lỗi tải danh sách lớp:", error);
                const errorOption = document.createElement("option");
                errorOption.value = "";
                errorOption.textContent = "Không thể tải danh sách lớp";
                errorOption.disabled = true;
                targetSelect.innerHTML = '';
                targetSelect.appendChild(errorOption);
                targetSelect.disabled = false;
            });
    }

    function populateLopSelect(selectElement, lopData, selectedId = null) {
        selectElement.innerHTML = '<option value="">-- Chọn lớp --</option>';

        if (!Array.isArray(lopData) || lopData.length === 0) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "Khoa này chưa có lớp";
            opt.disabled = true;
            selectElement.appendChild(opt);
            return;
        }

        lopData.forEach(lop => {
            const opt = document.createElement("option");
            opt.value = lop.Lop_id || lop.id || lop.MaLop;
            opt.textContent = lop.TenLop || lop.name;
            if (selectedId && (lop.Lop_id == selectedId || lop.id == selectedId || lop.MaLop == selectedId)) {
                opt.selected = true;
            }
            selectElement.appendChild(opt);
        });
    }

    // ============= LOAD + LỌC KHOA =============
    function loadStudents(page = 1) {
        currentPage = page;
        showTableLoading();

        const keyword = currentFilterState.search;
        const khoaFilter = currentFilterState.khoa || "0";
        const tbody = document.getElementById("studentTableBody");

        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5">
            <div class="spinner-wave mx-auto mb-2">
                <div></div><div></div><div></div>
            </div>
            <div class="text-muted">Đang tải dữ liệu...</div>
        </td></tr>`;

        // Xây dựng URL
        let url = `/Admin/AdminStudent/LoadStudents?page=${page}&pageSize=${pageSize}`;

        if (keyword) {
            url += `&keyword=${encodeURIComponent(keyword)}`;
        }

        // SỬA 3: Không gửi tham số khoa nếu là "0" (Tất cả)
        if (khoaFilter && khoaFilter !== "0") {
            url += `&khoa=${encodeURIComponent(khoaFilter)}`;
        }

        // Thêm timestamp để tránh cache
        url += `&_t=${Date.now()}`;

        setTimeout(() => {
            fetch(url)
                .then(r => {
                    if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
                    return r.json();
                })
                .then(data => {
                    // SỬA 4: Bỏ lọc khi chọn "0"
                    const filteredItems = validateFilteredData(data.items || [], khoaFilter);

                    renderStudentTable(filteredItems, page);
                    setupPagination(data.page || 1, data.totalPages || 1);

                    setTimeout(hideTableLoading, 100);
                })
                .catch(err => {
                    console.error("Load error:", err);
                    tbody.innerHTML = `<tr><td colspan="7" class="text-danger text-center py-4">Lỗi tải dữ liệu: ${err.message}</td></tr>`;
                    hideTableLoading();
                });
        }, 300);
    }

    function validateFilteredData(items, khoaFilter) {
        // SỬA 5: Kiểm tra !== "0"
        if (!khoaFilter || khoaFilter === "" || khoaFilter === "0") return items;

        // Lọc lại phía client để đảm bảo
        return items.filter(item => {
            const itemKhoaId = item.Khoa_id || item.MaKhoa || item.Khoa;
            return itemKhoaId == khoaFilter;
        });
    }

    // ============= RENDER BẢNG SINH VIÊN =============
    function renderStudentTable(items, page) {
        const tbody = document.getElementById("studentTableBody");
        if (!items || items.length === 0) {
            // SỬA 6: Kiểm tra !== "0"
            const noDataMessage = (currentFilterState.khoa && currentFilterState.khoa !== "0") || currentFilterState.search ?
                '<small class="text-muted">Thử thay đổi bộ lọc hoặc tìm kiếm</small>' :
                '';

            tbody.innerHTML = `
            <tr class="no-data-row">
                <td colspan="7" class="text-muted py-4 text-center">
                    <div class="py-3">
                        <i class="fas fa-inbox fa-2x text-muted mb-2"></i>
                        <div class="fw-medium">Không có dữ liệu</div>
                        ${noDataMessage}
                    </div>
                </td>
            </tr>`;
            return;
        }

        tbody.innerHTML = items.map((s, i) => {
            const stt = (page - 1) * pageSize + i + 1;
            return `
            <tr>
                <td class="stt-cell">${stt}</td>
                <td class="fw-bold">${s.MSSV || "-"}</td>
                <td class="truncate" title="${s.HoTen || "-"}">${s.HoTen || "-"}</td>
                <td>${s.GioiTinh || "-"}</td>
                <td class="truncate" title="${s.TenKhoa || "-"}">${s.TenKhoa || "-"}</td>
                <td class="truncate" title="${s.TenLop || "Chưa có"}">${s.TenLop || "Chưa có"}</td>

                <td class="action-cell">
                    <button class="btn btn-sm btn-warning btn-edit-student me-1" title="Sửa"
                        data-id="${s.MSSV}"
                        data-hoten="${s.HoTen || ""}"
                        data-gioitinh="${s.GioiTinh || ""}"
                        data-lop="${s.Lop_id || ""}"
                        data-khoa="${s.Khoa_id || ""}"
                        data-email="${s.Email || ""}"
                        data-sdt="${s.SoDienThoaiSinhVien || ""}"
                        data-quequan="${s.QueQuan || ""}"
                        data-ngaysinh="${s.NgaySinh || ""}">
                        <i class="fas fa-edit"></i>
                    </button>

                    <button class="btn btn-sm btn-danger btn-delete-student me-1" title="Xóa"
                        data-id="${s.MSSV}">
                        <i class="fas fa-trash"></i>
                    </button>

                    <button class="btn btn-sm btn-info btn-detail-student me-1 text-white" title="Chi tiết"
                        data-id="${s.MSSV}">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </td>
            </tr>`;
        }).join("");

        // Cập nhật UI filter sau khi render
        updateFilterUI();
    }

    // ============= CẬP NHẬT UI FILTER =============
    function updateFilterUI() {
        // Cập nhật trạng thái active cho dropdown
        const roleFilter = document.getElementById("roleFilter");
        const searchBox = document.getElementById("searchBox");

        if (roleFilter && currentFilterState.khoa) {
            roleFilter.value = currentFilterState.khoa;
        }

        if (searchBox && currentFilterState.search) {
            searchBox.value = currentFilterState.search;
        }

        // HIỂN THỊ BADGE FILTER - COMMENT HOẶC XÓA DÒNG NÀY
        // updateFilterBadge(); // <-- BỎ COMMENT NÀY ĐỂ ẨN BADGE

        // Hiển thị/ẩn nút xóa filter
        updateClearFilterButton();
    }

    function updateFilterBadge() {
        const badgeContainer = document.getElementById("filterBadgeContainer");
        if (!badgeContainer) return;

        let badgeHTML = '';

        // SỬA 7: Kiểm tra !== "0"
        if (currentFilterState.khoa && currentFilterState.khoa !== "0") {
            const khoaName = khoaMapping[currentFilterState.khoa] || `Khoa ${currentFilterState.khoa}`;
            badgeHTML += `<span class="badge bg-info me-2">
            <i class="fas fa-filter me-1"></i>${khoaName}
        </span>`;
        }

        if (currentFilterState.search) {
            badgeHTML += `<span class="badge bg-warning text-dark me-2">
            <i class="fas fa-search me-1"></i>"${currentFilterState.search}"
        </span>`;
        }

        badgeContainer.innerHTML = badgeHTML;
    }

    // ============= NÚT XÓA BỘ LỌC =============
    function addClearFilterButton() {
        const filterContainer = document.querySelector('.filter-container');
        if (!filterContainer || document.getElementById('clearFilterBtn')) return;

        const clearBtn = document.createElement('button');
        clearBtn.id = 'clearFilterBtn';
        clearBtn.className = 'btn btn-outline-danger btn-sm ms-2';
        clearBtn.innerHTML = '<i class="fas fa-times me-1"></i>Xóa lọc';
        clearBtn.title = 'Xóa tất cả bộ lọc';
        clearBtn.onclick = clearAllFilters;
        clearBtn.style.display = 'none';

        filterContainer.appendChild(clearBtn);
    }

    function updateClearFilterButton() {
        const clearBtn = document.getElementById('clearFilterBtn');
        if (!clearBtn) return;

        // SỬA 8: Kiểm tra !== "0"
        const hasActiveFilter = (currentFilterState.khoa && currentFilterState.khoa !== "0") || currentFilterState.search;
        clearBtn.style.display = hasActiveFilter ? 'inline-block' : 'none';
    }

    function clearAllFilters() {
        const roleFilter = document.getElementById("roleFilter");
        const searchBox = document.getElementById("searchBox");

        if (roleFilter) {
            roleFilter.value = "0";
            currentFilterState.khoa = "0";
        }

        if (searchBox) {
            searchBox.value = "";
            currentFilterState.search = "";
        }

        currentPage = 1;
        saveFilterState();
        showTableLoading();
        loadStudents();
        updateFilterUI();
    }

    // ============= KHỞI TẠO BỘ LỌC =============
    function initFilterSystem() {
        // Khôi phục filter từ localStorage
        restoreFilterState();

        // Kiểm tra URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const urlKhoa = urlParams.get('khoa');
        const urlSearch = urlParams.get('search');
        const urlPage = urlParams.get('page');

        if (urlKhoa !== null) {
            const roleFilter = document.getElementById("roleFilter");
            if (roleFilter) {
                roleFilter.value = urlKhoa || "0";
                currentFilterState.khoa = urlKhoa || "0";
            }
        } else {
            currentFilterState.khoa = "0";
        }

        if (urlSearch !== null) {
            const searchBox = document.getElementById("searchBox");
            if (searchBox) {
                searchBox.value = urlSearch;
                currentFilterState.search = urlSearch;
            }
        }

        if (urlPage) {
            currentPage = parseInt(urlPage);
        }

        // Thêm container cho badge filter
        addFilterBadgeContainer();

        // Cập nhật UI ban đầu
        updateFilterUI();
    }

    function addFilterBadgeContainer() {
        const tableHeader = document.querySelector('.card-header') ||
            document.querySelector('.table-responsive')?.previousElementSibling;
        if (!tableHeader || document.getElementById("filterBadgeContainer")) return;

        const badgeContainer = document.createElement('div');
        badgeContainer.id = 'filterBadgeContainer';
        badgeContainer.className = 'mt-2';

        tableHeader.appendChild(badgeContainer);
    }

    // ============= PHÂN TRANG =============
    function setupPagination(page, totalPages) {
        const container = document.getElementById("pageNumbersStudent");
        const prevBtn = document.getElementById("prevStudent");
        const nextBtn = document.getElementById("nextStudent");
        container.innerHTML = "";

        if (totalPages <= 1) {
            prevBtn.disabled = nextBtn.disabled = true;
            return;
        }

        prevBtn.disabled = page <= 1;
        nextBtn.disabled = page >= totalPages;

        prevBtn.onclick = () => {
            if (prevBtn.disabled || isLoading) return;
            showTableLoading();
            loadStudents(page - 1);
        };

        nextBtn.onclick = () => {
            if (nextBtn.disabled || isLoading) return;
            showTableLoading();
            loadStudents(page + 1);
        };

        const max = 7;
        let start = Math.max(1, page - Math.floor(max / 2));
        let end = Math.min(totalPages, start + max - 1);
        if (end - start + 1 < max) start = Math.max(1, end - max + 1);

        if (start > 1) addBtn(1);
        if (start > 2) addEllipsis();
        for (let i = start; i <= end; i++) addBtn(i);
        if (end < totalPages - 1) addEllipsis();
        if (end < totalPages) addBtn(totalPages);

        function addBtn(p) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "btn btn-sm mx-1";
            b.classList.add(p === page ? "btn-primary" : "btn-outline-secondary");
            b.textContent = p;
            b.onclick = () => {
                if (isLoading) return;
                showTableLoading();
                loadStudents(p);
            };
            container.appendChild(b);
        }

        function addEllipsis() {
            const s = document.createElement("span");
            s.className = "mx-2 text-muted";
            s.textContent = "...";
            container.appendChild(s);
        }
    }

});