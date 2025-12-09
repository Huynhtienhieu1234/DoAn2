// ~/Areas/Content/AdminStudentRegister/AdminStudentRegister.js
// HOÀN HẢO – ĐÃ FIX LỖI DẤU NHÁY + CHẠY NGON 100%

document.addEventListener("DOMContentLoaded", function () {
    let currentDeleteMSSV = null;
    let currentPage = 1;
    const pageSize = 5;

    setupEventListeners();
    loadStudents();

    function setupEventListeners() {
        document.getElementById("btnAddStudent")?.addEventListener("click", () => showModal("createStudentModal"));
        document.getElementById("btnImportExcel")?.addEventListener("click", () => showModal("importExcelModal"));
        document.getElementById("btnViewDeletedStudent")?.addEventListener("click", () => showModal("deletedStudentsModal"));
        document.getElementById("exportAllStudents")?.addEventListener("click", exportAllStudents);

        document.getElementById("createStudentForm")?.addEventListener("submit", handleCreateSubmit);
        document.getElementById("editStudentForm")?.addEventListener("submit", handleEditSubmit);
        document.getElementById("confirmDeleteStudentBtn")?.addEventListener("click", handleConfirmDelete);
        document.getElementById("importForm")?.addEventListener("submit", handleImportExcel);

        document.getElementById("searchStudentBox")?.addEventListener("input", debounce(() => {
            currentPage = 1;
            loadStudents();
        }, 400));

        document.getElementById("studentTableBody")?.addEventListener("click", function (e) {
            const btn = e.target.closest("button");
            if (!btn) return;
            if (btn.classList.contains("btn-edit-student")) handleEdit.call(btn);
            else if (btn.classList.contains("btn-delete-student")) handleDelete.call(btn);
            else if (btn.classList.contains("btn-detail-student")) handleDetail.call(btn);
        });
    }

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
                    showToast(d.message || "Thêm thành công!", "success");
                    loadStudents();
                } else showToast(d.message || "Thêm thất bại!", "error");
            })
            .catch(() => showToast("Lỗi server!", "error"))
            .finally(() => resetButton(btn, "Lưu"));
    }

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

    function handleDetail() {
        const row = this.closest("tr");
        document.getElementById("detailMSSV").textContent = row.cells[1].textContent;
        document.getElementById("detailHoTen").textContent = row.cells[2].textContent;
        document.getElementById("detailGioiTinh").textContent = row.cells[3].textContent;
        document.getElementById("detailKhoa") && (document.getElementById("detailKhoa").textContent = row.cells[4].textContent);
        document.getElementById("detailLop").textContent = row.cells[5].textContent;
        showModal("detailStudentModal");
    }

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

    function loadStudents(page = 1) {
        currentPage = page;
        const keyword = document.getElementById("searchStudentBox")?.value.trim() || "";
        const tbody = document.getElementById("studentTableBody");
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5"><i class="fa fa-spinner fa-spin fa-2x"></i><br>Đang tải dữ liệu...</td></tr>`;

        fetch(`/Admin/AdminStudent/LoadStudents?page=${page}&pageSize=${pageSize}&keyword=${encodeURIComponent(keyword)}`)
            .then(r => r.json())
            .then(data => {
                renderStudentTable(data.items || [], page);
                setupPagination(data.page || 1, data.totalPages || 1);
            })
            .catch(err => {
                console.error("Load error:", err);
                tbody.innerHTML = `<tr><td colspan="7" class="text-danger text-center py-4">Lỗi tải dữ liệu</td></tr>`;
            });
    }

    function renderStudentTable(items, page) {
        const tbody = document.getElementById("studentTableBody");
        if (!items || items.length === 0) {
            tbody.innerHTML = `<tr class="no-data-row"><td colspan="7" class="text-muted py-4">Không có dữ liệu</td></tr>`;
            return;
        }

        tbody.innerHTML = items.map((s, i) => {
            const stt = (page - 1) * pageSize + i + 1;
            return `
                <tr>
                    <td>${stt}</td>
                    <td>${s.MSSV || "-"}</td>
                    <td>${s.HoTen || "-"}</td>
                    <td>${s.GioiTinh || "-"}</td>
                    <td>${s.TenKhoa || "-"}</td>
                    <td>${s.TenLop || "Chưa có"}</td>
                    <td class="action-cell">
                        <button class="btn btn-sm btn-warning btn-edit-student me-1" title="Sửa"
                            data-id="${s.MSSV}"
                            data-hoten="${s.HoTen || ""}"
                            data-gioitinh="${s.GioiTinh || ""}"
                            data-lop="${s.Lop_id || ""}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger btn-delete-student me-1" title="Xóa" data-id="${s.MSSV}">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="btn btn-sm btn-info btn-detail-student me-1 text-white" title="Chi tiết" data-id="${s.MSSV}">
                            <i class="fas fa-info-circle"></i>
                        </button>
                    </td>
                </tr>`;
        }).join("");
    }

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
        prevBtn.onclick = () => loadStudents(page - 1);
        nextBtn.onclick = () => loadStudents(page + 1);

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
            b.onclick = () => loadStudents(p);
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
        window.location.href = "/Admin/AdminStudent/ExportAllStudents";
    }

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