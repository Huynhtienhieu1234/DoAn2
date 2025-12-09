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

    document.getElementById("createKhoa").addEventListener("change", function () {
        const khoaId = this.value;
        const lopSelect = document.getElementById("createLop");

        // Xóa option cũ
        lopSelect.innerHTML = '<option value="">-- Chọn lớp --</option>';

        if (!khoaId) return;

        // Gọi API lấy danh sách lớp theo khoa
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
                }
            })
            .catch(() => {
                showToast("Không tải được danh sách lớp!", "error");
            });
    });

    function handleCreateSubmit(e) {
        e.preventDefault();
        const form = this;
        const btn = form.querySelector("button[type=submit]");
        if (!form.checkValidity()) { form.reportValidity(); return; }

        const fd = new FormData(form);
        showLoading(btn, "Đang lưu...");
        fetch("/Admin/AdminStudent/CreateAjax", { method: "POST", body: fd })
            .then(r => r.json())
            .then(d => {
                if (d.success) {
                    hideModal("createStudentModal");
                    showToast(d.message || "Thêm sinh viên thành công!", "success");
                    loadStudents();

                    // 🔧 Reset toàn bộ ô nhập
                    form.reset();

                    // 🔧 Reset lại dropdown lớp về mặc định
                    const lopSelect = document.getElementById("createLop");
                    if (lopSelect) {
                        lopSelect.innerHTML = '<option value="">-- Chọn lớp --</option>';
                    }
                } else {
                    showToast(d.message || "Thêm thất bại!", "error");
                }
            })
            .catch(() => showToast("Lỗi server!", "error"))
            .finally(() => resetButton(btn, "Lưu"));
    }

    // ============= CHỈNH SỬA =============
    function handleEdit() {
        const d = this.dataset;
        document.getElementById("editMSSV").value = d.id;
        document.getElementById("editHoTen").value = d.hoten || "";
        document.getElementById("editGioiTinh").value = d.gioitinh || "Nam";
        document.getElementById("editLop").value = d.lop || "";
        showModal("editStudentModal");
    }

    function handleEditSubmit(e) {
        e.preventDefault();
        const form = this;
        const btn = form.querySelector("button[type=submit]");
        showLoading(btn, "Đang lưu...");
        fetch("/Admin/AdminStudent/EditAjax", { method: "POST", body: new FormData(form) })
            .then(r => r.json())
            .then(d => {
                hideModal("editStudentModal");
                showToast(d.success ? "Cập nhật thành công!" : d.message, d.success ? "success" : "error");
                if (d.success) loadStudents(currentPage);
            })
            .finally(() => resetButton(btn, "Lưu thay đổi"));
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

    // ============= CHI TIẾT =============
    function handleDetail() {
        const row = this.closest("tr");
        document.getElementById("detailMSSV").textContent = row.cells[1].textContent;
        document.getElementById("detailHoTen").textContent = row.cells[2].textContent;
        document.getElementById("detailGioiTinh").textContent = row.cells[3].textContent;
        if (document.getElementById("detailKhoa")) document.getElementById("detailKhoa").textContent = row.cells[4].textContent;
        document.getElementById("detailLop").textContent = row.cells[5].textContent;
        showModal("detailStudentModal");
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

    function renderStudentTable(items, page) {
        const tbody = document.getElementById("studentTableBody");
        if (!items || items.length === 0) {
            tbody.innerHTML = `<tr class="no-data-row"><td colspan="7" class="text-muted py-4">
                <i class="fas fa-inbox me-2"></i>Không có dữ liệu
            </td></tr>`;
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
                    <td class="truncate" title="${s.TenLop || 'Chưa có'}">${s.TenLop || 'Chưa có'}</td>

                    <td class="action-cell">
                        <button class="btn btn-sm btn-edit-student me-1" title="Sửa"
                            data-id="${s.MSSV}"
                            data-hoten="${s.HoTen || ""}"
                            data-gioitinh="${s.GioiTinh || ""}"
                            data-lop="${s.Lop_id || ""}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-delete-student me-1" title="Xóa" data-id="${s.MSSV}">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="btn btn-sm btn-detail-student me-1" title="Chi tiết" data-id="${s.MSSV}">
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