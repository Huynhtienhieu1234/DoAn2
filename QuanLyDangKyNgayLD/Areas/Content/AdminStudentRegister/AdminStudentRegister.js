// ~/Areas/Content/AdminStudentRegister/AdminStudentRegister.js
// ĐÃ ĐỒNG BỘ HOÀN TOÀN VỚI THANH CÔNG CỤ MỚI (LỌC KHOA + NHẬP/XUẤT EXCEL)
// 🎯 ĐÃ THÊM HIỆU ỨNG LOADING MƯỢT MÀ

document.addEventListener("DOMContentLoaded", function () {
    let currentDeleteMSSV = null;
    let currentPage = 1;
    const pageSize = 5;
    let isLoading = false; // Biến kiểm soát trạng thái loading

    setupEventListeners();
    loadStudents();

    function setupEventListeners() {
        // === NÚT TRÊN THANH CÔNG CỤ (ĐÃ ĐỔI THEO ID MỚI) ===
        document.getElementById("btnAdd")?.addEventListener("click", () => showModal("createStudentModal"));
        document.getElementById("btnViewDeleted")?.addEventListener("click", () => showModal("deletedStudentsModal"));

        // Nút Nhập Excel (bạn đang dùng id exportAllAccounts → sửa thành đúng)
        document.querySelector('button[id="exportAllAccounts"]:nth-of-type(1)')?.addEventListener("click", () => showModal("importExcelModal"));

        // Nút Xuất Excel
        document.querySelector('button[id="exportAllAccounts"]:nth-of-type(2)')?.addEventListener("click", exportAllStudents);

        // Form xử lý
        document.getElementById("createStudentForm")?.addEventListener("submit", handleCreateSubmit);





        document.getElementById("editStudentForm")?.addEventListener("submit", handleEditSubmit);
        document.getElementById("confirmDeleteStudentBtn")?.addEventListener("click", handleConfirmDelete);
        document.getElementById("importForm")?.addEventListener("submit", handleImportExcel);

        // Lọc theo Khoa + Tìm kiếm
        document.getElementById("roleFilter")?.addEventListener("change", () => {
            currentPage = 1;
            loadStudents();
        });

        document.getElementById("searchBox")?.addEventListener("input", debounce(() => {
            currentPage = 1;
            loadStudents();
        }, 400));

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

        // Thêm class loading cho smooth transition
        tbody.classList.add('loading');

        // Hiện overlay loading
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
        }

        // Hiệu ứng fade out cho bảng cũ
        setTimeout(() => {
            tbody.style.opacity = '0.3';
            tbody.style.filter = 'blur(2px)';
        }, 50);
    }

    function hideTableLoading() {
        isLoading = false;

        const tbody = document.getElementById("studentTableBody");
        const loadingOverlay = document.getElementById("loadingOverlay");

        // Ẩn overlay loading
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
        }

        // Hiệu ứng fade in cho bảng mới
        tbody.style.opacity = '1';
        tbody.style.filter = 'none';
        tbody.classList.remove('loading');
    }




    // ============= THÊM MỚI =============

    // Thêm sự kiện khi modal tạo mới được mở (để reset form)
    document.getElementById('createStudentModal')?.addEventListener('show.bs.modal', function () {
        // Reset dropdown Khoa về mặc định
        const createKhoa = document.getElementById("createKhoa");
        if (createKhoa) createKhoa.value = "";

        // Reset dropdown Lớp
        const lopSelect = document.getElementById("createLop");
        if (lopSelect) {
            lopSelect.innerHTML = '<option value="">-- Chọn lớp --</option>';
        }

        // Reset ngày sinh để trống
        const createNgaySinh = document.getElementById("createNgaySinh");
        if (createNgaySinh) createNgaySinh.value = "";

        // Reset giới tính về Nam
        const createGioiTinh = document.querySelector("select[name='GioiTinh']");
        if (createGioiTinh) createGioiTinh.value = "Nam";

        // Reset các trường input khác
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

    // Sự kiện chọn Khoa trong modal tạo mới
    const createKhoaElement = document.getElementById("createKhoa");
    if (createKhoaElement) {
        createKhoaElement.addEventListener("change", function () {
            const khoaId = this.value;
            const lopSelect = document.getElementById("createLop");

            // Xóa option cũ nếu tồn tại
            if (lopSelect) {
                lopSelect.innerHTML = '<option value="">-- Chọn lớp --</option>';
            }

            if (!khoaId) return;

            // Gọi API lấy danh sách lớp theo khoa
            fetch(`/Admin/AdminStudent/GetLopByKhoa?khoaId=${encodeURIComponent(khoaId)}`)
                .then(r => {
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    return r.json();
                })
                .then(data => {
                    if (lopSelect) {
                        if (Array.isArray(data) && data.length > 0) {
                            data.forEach(lop => {
                                const opt = document.createElement("option");
                                opt.value = lop.Lop_id;
                                opt.textContent = lop.TenLop;
                                lopSelect.appendChild(opt);
                            });
                        } else {
                            // Nếu không có lớp nào
                            const opt = document.createElement("option");
                            opt.value = "";
                            opt.textContent = "Khoa này chưa có lớp";
                            opt.disabled = true;
                            lopSelect.appendChild(opt);
                        }
                    }
                })
                .catch(error => {
                    console.error("Lỗi tải danh sách lớp:", error);
                    showToast("Không tải được danh sách lớp! Vui lòng thử lại.", "error");

                    // Thêm option lỗi
                    if (lopSelect) {
                        const opt = document.createElement("option");
                        opt.value = "";
                        opt.textContent = "Lỗi tải danh sách lớp";
                        opt.disabled = true;
                        lopSelect.appendChild(opt);
                    }
                });
        });
    }

    // Hàm kiểm tra email hợp lệ
    function isValidEmail(email) {
        if (!email) return true; // Email không bắt buộc
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Hàm kiểm tra định dạng ngày dd/MM/yyyy
    function isValidDateDDMMYYYY(dateString) {
        if (!dateString) return true; // Ngày không bắt buộc

        const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        const match = dateString.match(regex);

        if (!match) return false;

        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);

        // Kiểm tra tháng hợp lệ
        if (month < 1 || month > 12) return false;

        // Kiểm tra ngày hợp lệ
        const daysInMonth = new Date(year, month, 0).getDate();
        if (day < 1 || day > daysInMonth) return false;

        // Kiểm tra năm hợp lệ (ví dụ: không quá năm hiện tại + 1)
        const currentYear = new Date().getFullYear();
        if (year < 1900 || year > currentYear + 1) return false;

        return true;
    }

    // Hàm chuyển đổi từ dd/MM/yyyy sang yyyy-MM-dd cho server
    function convertDDMMYYYYtoYYYYMMDD(dateString) {
        if (!dateString) return "";

        const parts = dateString.split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dateString;
    }

    // Thêm sự kiện cho ô MSSV để chỉ cho phép nhập số
    const createMSSVElement = document.querySelector("input[name='MSSV']");
    if (createMSSVElement) {
        createMSSVElement.addEventListener("input", function (e) {
            this.value = this.value.replace(/\D/g, '');
        });
    }

    // Thêm sự kiện cho ô số điện thoại
    const createSDTElement = document.querySelector("input[name='SoDienThoaiSinhVien']");
    if (createSDTElement) {
        createSDTElement.addEventListener("input", function (e) {
            this.value = this.value.replace(/\D/g, '');

            // Giới hạn 10 số
            if (this.value.length > 10) {
                this.value = this.value.slice(0, 10);
            }
        });
    }

    // Thêm sự kiện cho ô ngày sinh để tự động định dạng dd/MM/yyyy
    const createNgaySinhElement = document.getElementById("createNgaySinh");
    if (createNgaySinhElement) {
        createNgaySinhElement.addEventListener("input", function (e) {
            let value = this.value.replace(/\D/g, '');

            // Tự động thêm dấu /
            if (value.length > 2 && value.length <= 4) {
                value = value.substring(0, 2) + '/' + value.substring(2);
            } else if (value.length > 4) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4) + '/' + value.substring(4, 8);
            }

            this.value = value;
        });
    }

    // Thêm sự kiện khi nhấn Enter trong form
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

        // Kiểm tra validation của form
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Kiểm tra các trường bắt buộc thủ công
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

        // Kiểm tra định dạng ngày sinh
        const ngaySinhInput = document.getElementById("createNgaySinh");
        const ngaySinh = ngaySinhInput?.value.trim();
        if (ngaySinh && !isValidDateDDMMYYYY(ngaySinh)) {
            showToast("Ngày sinh không hợp lệ! Vui lòng nhập đúng định dạng dd/MM/yyyy", "error");
            ngaySinhInput?.focus();
            return;
        }

        // Kiểm tra email nếu có
        const emailInput = document.querySelector("input[name='Email']");
        const email = emailInput?.value.trim();
        if (email && !isValidEmail(email)) {
            showToast("Email không hợp lệ!", "error");
            emailInput?.focus();
            return;
        }

        // Hiển thị loading
        showLoading(btn, "Đang lưu...");

        // Tạo FormData
        const fd = new FormData(form);

        // Chuyển đổi ngày sinh từ dd/MM/yyyy sang yyyy-MM-dd cho server
        if (ngaySinh) {
            fd.set("NgaySinh", convertDDMMYYYYtoYYYYMMDD(ngaySinh));
        }

        // Gửi request
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
                    // Đóng modal
                    hideModal("createStudentModal");

                    // Hiển thị thông báo thành công
                    showToast(d.message || "Thêm sinh viên thành công!", "success");

                    // Tải lại danh sách
                    loadStudents();
                } else {
                    // Hiển thị lỗi từ server
                    showToast(d.message || "Thêm thất bại!", "error");

                    // Nếu lỗi trùng MSSV, focus vào ô MSSV
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
        fd.append("mssv", currentDeleteMSSV);
        fetch("/Admin/AdminStudent/DeleteAjax", { method: "POST", body: fd })
            .then(r => r.json())
            .then(d => {
                hideModal("deleteStudentModal");
                showToast(d.success ? "Xóa thành công!" : d.message, d.success ? "success" : "error");
                if (d.success) loadStudents(currentPage);
            })
            .finally(() => resetButton(btn, "Xác nhận xóa"));
    }





    // ============= CHỈNH SỬA =============

    // Sự kiện đổi Khoa trong modal chỉnh sửa
    document.getElementById("editKhoa")?.addEventListener("change", function () {
        const khoaId = this.value;
        const lopSelect = document.getElementById("editLop");
        lopSelect.innerHTML = '<option value="">-- Chọn lớp --</option>';

        if (!khoaId) return;

        fetch(`/Admin/AdminStudent/GetLopByKhoa?khoaId=${encodeURIComponent(khoaId)}`)
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    data.forEach(lop => {
                        const opt = document.createElement("option");
                        opt.value = lop.Lop_id;
                        opt.textContent = lop.TenLop;
                        lopSelect.appendChild(opt);
                    });

                    // Giữ lại lớp cũ nếu có
                    const oldLopId = lopSelect.getAttribute("data-old-value");
                    if (oldLopId) {
                        lopSelect.value = oldLopId;
                    }
                }
            })
            .catch(() => {
                showToast("Không tải được danh sách lớp!", "error");
            });
    });

    // Reset khi mở modal
    document.getElementById('editStudentModal')?.addEventListener('show.bs.modal', function () {
        document.getElementById("editLop").removeAttribute("data-old-value");
    });

    // Hàm format ngày từ bất kỳ định dạng nào sang yyyy-MM-dd (cho input type="date")
    function formatDateToYMD(dateString) {
        if (!dateString || dateString === "" || dateString === "undefined") return "";

        let date = null;

        try {
            // Trường hợp 1: Định dạng JSON Date: /Date(1672444800000)/
            if (dateString.includes("/Date(")) {
                const timestamp = parseInt(dateString.match(/\d+/)[0]);
                date = new Date(timestamp);
            }
            // Trường hợp 2: Định dạng ISO: 2023-12-31T00:00:00
            else if (dateString.includes("T")) {
                date = new Date(dateString);
            }
            // Trường hợp 3: Định dạng dd/MM/yyyy
            else if (dateString.includes("/")) {
                const parts = dateString.split("/");
                if (parts.length === 3) {
                    const day = parseInt(parts[0]);
                    const month = parseInt(parts[1]) - 1; // Tháng trong JS là 0-11
                    const year = parseInt(parts[2]);
                    date = new Date(year, month, day);
                }
            }
            // Trường hợp 4: Định dạng yyyy-MM-dd (đã đúng)
            else if (dateString.includes("-") && dateString.length === 10) {
                return dateString; // Đã đúng định dạng
            }
            // Trường hợp 5: Thử parse trực tiếp
            else {
                date = new Date(dateString);
            }

            if (date && !isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                return `${year}-${month}-${day}`;
            }
        } catch (e) {
            console.log("Lỗi định dạng ngày:", e, "Chuỗi:", dateString);
        }

        return ""; // Trả về rỗng nếu không parse được
    }

    // Hàm format ngày để hiển thị dd/MM/yyyy
    function formatDateToDMY(dateString) {
        if (!dateString || dateString === "" || dateString === "undefined") return "-";

        let date = null;

        try {
            if (dateString.includes("/Date(")) {
                const timestamp = parseInt(dateString.match(/\d+/)[0]);
                date = new Date(timestamp);
            }
            else if (dateString.includes("T")) {
                date = new Date(dateString);
            }
            else if (dateString.includes("/")) {
                const parts = dateString.split("/");
                if (parts.length === 3) {
                    const day = parseInt(parts[0]);
                    const month = parseInt(parts[1]) - 1;
                    const year = parseInt(parts[2]);
                    date = new Date(year, month, day);
                }
            }
            else if (dateString.includes("-") && dateString.length === 10) {
                const parts = dateString.split("-");
                if (parts.length === 3) {
                    const year = parseInt(parts[0]);
                    const month = parseInt(parts[1]) - 1;
                    const day = parseInt(parts[2]);
                    date = new Date(year, month, day);
                }
            }
            else {
                date = new Date(dateString);
            }

            if (date && !isNaN(date.getTime())) {
                const day = String(date.getDate()).padStart(2, "0");
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
            }
        } catch (e) {
            console.log("Lỗi định dạng ngày hiển thị:", e);
        }

        return dateString || "-"; // Trả về chuỗi gốc nếu không parse được
    }

    // Hàm mở modal chỉnh sửa
    function handleEdit() {
        const d = this.dataset;

        console.log("Dataset khi edit:", d); // Debug để xem có dữ liệu gì

        // Điền thông tin cơ bản
        document.getElementById("editMSSV").value = d.id || "";
        document.getElementById("editHoTen").value = d.hoten || "";

        // Xử lý Ngày sinh - CHUYỂN SANG yyyy-MM-dd CHO INPUT DATE
        const ngaySinhFormatted = formatDateToYMD(d.ngaysinh);
        document.getElementById("editNgaySinh").value = ngaySinhFormatted;

        document.getElementById("editGioiTinh").value = d.gioitinh || "Nam";
        document.getElementById("editQueQuan").value = d.quequan || "";
        document.getElementById("editEmail").value = d.email || "";
        document.getElementById("editSDT").value = d.sdt || "";
        document.getElementById("editKhoa").value = d.khoa || "";

        const lopSelect = document.getElementById("editLop");

        // Reset dropdown lớp
        lopSelect.innerHTML = '<option value="">-- Chọn lớp --</option>';

        // Lưu giá trị lớp cũ
        if (d.lop && d.lop !== "undefined") {
            lopSelect.setAttribute("data-old-value", d.lop);
        }

        // Nếu có Khoa thì load lớp theo khoa
        if (d.khoa && d.khoa !== "undefined") {
            fetch(`/Admin/AdminStudent/GetLopByKhoa?khoaId=${encodeURIComponent(d.khoa)}`)
                .then(r => r.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        data.forEach(lop => {
                            const opt = document.createElement("option");
                            opt.value = lop.Lop_id;
                            opt.textContent = lop.TenLop;
                            lopSelect.appendChild(opt);
                        });

                        // Chọn lớp cũ sau khi load xong
                        if (d.lop && d.lop !== "undefined") {
                            setTimeout(() => {
                                lopSelect.value = d.lop;
                            }, 100);
                        }
                    }
                })
                .catch(() => {
                    console.log("Không tải được danh sách lớp");
                    // Fallback: tạo option với lớp cũ
                    if (d.lop && d.lop !== "undefined") {
                        const opt = document.createElement("option");
                        opt.value = d.lop;
                        opt.textContent = "Lớp cũ";
                        lopSelect.appendChild(opt);
                        lopSelect.value = d.lop;
                    }
                });
        } else {
            // Nếu không có Khoa, vẫn set giá trị Lớp nếu có
            if (d.lop && d.lop !== "undefined") {
                const opt = document.createElement("option");
                opt.value = d.lop;
                opt.textContent = "Lớp cũ";
                lopSelect.appendChild(opt);
                lopSelect.value = d.lop;
            }
        }

        showModal("editStudentModal");
    }

    // Submit form chỉnh sửa
    function handleEditSubmit(e) {
        e.preventDefault();

        const form = this;
        const btn = form.querySelector("button[type=submit]");
        showLoading(btn, "Đang lưu...");

        // Kiểm tra định dạng ngày trước khi submit (tùy chọn)
        const ngaySinhInput = document.getElementById("editNgaySinh");
        if (ngaySinhInput.value) {
            // Chuyển đổi từ yyyy-MM-dd sang định dạng phù hợp với server nếu cần
            // Hoặc để nguyên vì input type="date" đã là yyyy-MM-dd
        }

        fetch("/Admin/AdminStudent/EditAjax", {
            method: "POST",
            body: new FormData(form)
        })
            .then(response => {
                if (!response.ok) throw new Error("Lỗi mạng hoặc sai đường dẫn API");
                return response.json();
            })
            .then(data => {
                hideModal("editStudentModal");
                showToast(
                    data.success ? "Cập nhật thành công!" : data.message,
                    data.success ? "success" : "error"
                );
                if (data.success) loadStudents(currentPage);
            })
            .catch(err => {
                showToast("Có lỗi xảy ra: " + err.message, "error");
            })
            .finally(() => {
                resetButton(btn, "Lưu thay đổi");
            });
    }

    // ============= CHI TIẾT =============
    function handleDetail() {
        const mssv = this.dataset.id;

        // Hiển thị loading trong modal
        const detailModal = document.getElementById("detailStudentModal");
        const modalBody = detailModal.querySelector('.modal-body');
        const originalContent = modalBody.innerHTML;

        modalBody.innerHTML = `
    <div class="text-center py-5">
        <div class="spinner-wave mx-auto mb-3">
            <div></div><div></div><div></div>
        </div>
        <div class="text-muted">Đang tải thông tin sinh viên...</div>
    </div>
`;

        // Hiển thị modal
        showModal("detailStudentModal");

        // Gọi API lấy chi tiết
        fetch(`/Admin/AdminStudent/DetailsAjax?id=${mssv}`)
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    const sv = data.data;

                    // Định dạng ngày sinh để hiển thị dd/MM/yyyy
                    let formattedNgaySinh = formatDateToDMY(sv.NgaySinh);

                    // Hiển thị thông tin
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
            `;
                } else {
                    // Hiển thị lỗi
                    modalBody.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${data.message || "Không thể tải thông tin sinh viên"}
                </div>
            `;
                }
            })
            .catch(err => {
                console.error("Lỗi tải chi tiết:", err);
                modalBody.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Lỗi kết nối khi tải thông tin
            </div>
        `;
            });
    }

































    // ============= IMPORT EXCEL =============
    function handleImportExcel(e) {
        e.preventDefault();
        const fileInput = document.getElementById("excelFileInput");
        const btn = document.getElementById("btnSubmitImport");
        if (!fileInput?.files?.length) {
            showToast("Vui lòng chọn file Excel!", "warning");
            return;
        }
        const fd = new FormData();
        fd.append("excelFile", fileInput.files[0]);
        showLoading(btn, "Đang nhập...");
        fetch("/Admin/AdminStudent/ImportExcel", { method: "POST", body: fd })
            .then(r => r.json())
            .then(d => {
                hideModal("importExcelModal");
                showToast(d.success ? `Nhập thành công ${d.inserted || 0} bản ghi!` : d.message, d.success ? "success" : "error");
                if (d.success) loadStudents();
            })
            .catch(() => showToast("Lỗi upload file!", "error"))
            .finally(() => {
                resetButton(btn, "Nhập dữ liệu");
                fileInput.value = "";
            });
    }

















    // ============= LOAD + LỌC KHOA =============
    function loadStudents(page = 1) {
        currentPage = page;

        // Hiệu ứng loading
        showTableLoading();

        const keyword = document.getElementById("searchBox")?.value.trim() || "";
        const khoaFilter = document.getElementById("roleFilter")?.value || "";
        const tbody = document.getElementById("studentTableBody");

        // Hiển thị loading spinner trong bảng
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5">
            <div class="spinner-wave mx-auto mb-2">
                <div></div><div></div><div></div>
            </div>
            <div class="text-muted">Đang tải dữ liệu...</div>
        </td></tr>`;

        let url = `/Admin/AdminStudent/LoadStudents?page=${page}&pageSize=${pageSize}&keyword=${encodeURIComponent(keyword)}`;
        if (khoaFilter && khoaFilter !== "TatCa") {
            url += `&khoa=${encodeURIComponent(khoaFilter)}`;
        }

        // Thêm delay nhỏ để hiệu ứng loading rõ hơn
        setTimeout(() => {
            fetch(url)
                .then(r => r.json())
                .then(data => {
                    renderStudentTable(data.items || [], page);
                    setupPagination(data.page || 1, data.totalPages || 1);

                    // Ẩn loading sau khi render xong
                    setTimeout(hideTableLoading, 100);
                })
                .catch(err => {
                    console.error("Load error:", err);
                    tbody.innerHTML = `<tr><td colspan="7" class="text-danger text-center py-4">Lỗi tải dữ liệu</td></tr>`;
                    hideTableLoading();
                });
        }, 300); // Delay nhỏ để hiệu ứng loading hiển thị
    }



    // ============= RENDER BẢNG SINH VIÊN =============
    function renderStudentTable(items, page) {
        const tbody = document.getElementById("studentTableBody");
        if (!items || items.length === 0) {
            tbody.innerHTML = `
            <tr class="no-data-row">
                <td colspan="7" class="text-muted py-4">
                    <i class="fas fa-inbox me-2"></i>Không có dữ liệu
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

        // Thêm hiệu ứng loading cho nút prev/next
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

    function exportAllStudents() {
        const khoaFilter = document.getElementById("roleFilter")?.value || "";
        let url = "/Admin/AdminStudent/ExportAllStudents";
        if (khoaFilter && khoaFilter !== "TatCa") {
            url += `?khoa=${encodeURIComponent(khoaFilter)}`;
        }
        window.location.href = url;
    }

    // ============= UTILITY =============
    function showModal(id) { bootstrap.Modal.getOrCreateInstance(document.getElementById(id)).show(); }
    function hideModal(id) { bootstrap.Modal.getInstance(document.getElementById(id))?.hide(); }
    function showLoading(btn, txt) { btn.disabled = true; btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>${txt}`; }
    function resetButton(btn, txt) { btn.disabled = false; btn.innerHTML = txt; }
    function showToast(msg, type = "info") { if (window.showToast) window.showToast(msg, type); else alert(msg); }
    function debounce(fn, wait) {
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
    }
});