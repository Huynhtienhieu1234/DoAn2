document.addEventListener("DOMContentLoaded", function () {
    const roleFilter = document.getElementById("roleFilter");
    const searchBox = document.getElementById("searchBox");
    const tableBody = document.getElementById("accountTableBody");
    const pageNumbers = document.getElementById("pageNumbers");
    const prevBtn = document.getElementById("prev");
    const nextBtn = document.getElementById("next");
    const loading = document.getElementById("loadingIndicator");
    const roleTabs = document.querySelectorAll(".role-tab-btn");

    let activeRole = "Tất Cả";
    let currentPage = 1;
    const pageSizeSelector = document.getElementById("pageSizeSelector");
    let pageSize = pageSizeSelector ? (parseInt(pageSizeSelector.value, 10) || 10) : 10;
    let totalPages = 1;
    let searchTimeout = null;

    if (pageSizeSelector) {
        pageSizeSelector.addEventListener("change", function () {
            pageSize = parseInt(this.value, 10) || 10;
            currentPage = 1;
            loadFilteredAccounts(1);
        });
    }

    // Hàm load dữ liệu với filter + search
    function loadFilteredAccounts(page = 1) {
        const role = activeRole;
        const search = searchBox ? searchBox.value.trim() : "";

        if (loading) loading.style.display = "block";
        animateTable();

        fetch(`/Admin/Account/FilterSearchAccounts?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}&role=${encodeURIComponent(role)}`)
            .then(r => r.json())
            .then(res => {
                const data = res.data;
                currentPage = res.currentPage;
                totalPages = res.totalPages || 1;
                tableBody.innerHTML = "";

                if (!data || data.length === 0) {
                    tableBody.innerHTML = `
                        <tr class="no-data-row">
                            <td colspan="6" class="text-muted py-4 text-center">Không có dữ liệu tài khoản</td>
                        </tr>`;
                    pageNumbers.innerHTML = "";
                    updatePrevNextButtons(prevBtn, nextBtn);
                    return;
                }

                data.forEach((acc, index) => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td class="text-center"><input type="checkbox" class="form-check-input check-item-account" value="${acc.TaiKhoan_id}"></td>
                        <td class="stt-cell">${(currentPage - 1) * pageSize + index + 1}</td>
                        <td>${acc.Username}</td>
                        <td class="text-truncate" style="max-width:200px;" title="${acc.Email ?? ""}">
                            ${acc.Email ?? ""}
                        </td>
                        <td>${acc.RoleName ?? "Chưa có vai trò"}</td>
                        <td class="action-cell text-center">
                            <button class="btn btn-sm btn-warning btn-edit me-1" data-id="${acc.TaiKhoan_id}" title="Sửa"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-danger btn-delete me-1" data-id="${acc.TaiKhoan_id}" title="Xóa"><i class="fas fa-trash"></i></button>
                            <button class="btn btn-sm btn-info btn-detail me-1 text-white" data-id="${acc.TaiKhoan_id}" title="Chi tiết"><i class="fas fa-info-circle"></i></button>
                            <button class="btn btn-sm btn-secondary btn-reset" data-id="${acc.TaiKhoan_id}" title="Đặt lại mật khẩu"><i class="fas fa-key"></i></button>
                        </td>`;
                    tableBody.appendChild(row);
                });

                renderPagination(pageNumbers, currentPage, totalPages);
                updatePrevNextButtons(prevBtn, nextBtn);
            })
            .catch(() => showToast("Không thể tải dữ liệu mới!", "error"))
            .finally(() => {
                if (loading) loading.style.display = "none";
            });
    }

    // Xử lý click Tab phân loại vai trò
    roleTabs.forEach(tab => {
        tab.addEventListener("click", function () {
            roleTabs.forEach(t => t.classList.remove("active"));
            this.classList.add("active");
            activeRole = this.dataset.role || "Tất Cả";

            // Đồng bộ dropdown nếu có
            if (roleFilter) {
                if (activeRole === "CanBo") roleFilter.value = "";
                else if (activeRole === "SinhVien") roleFilter.value = "Sinh viên";
                else if (activeRole === "LopTruong") roleFilter.value = "Lớp phó lao động";
                else roleFilter.value = "Tất Cả";
            }

            currentPage = 1;
            loadFilteredAccounts(1);
        });
    });

    // Render phân trang gọn gàng (Smart Pagination)
    function renderPagination(container, currentPage, totalPages) {
        if (!container) return;
        container.innerHTML = "";

        if (totalPages <= 1) return;

        const maxButtons = 5;
        let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        let end = Math.min(totalPages, start + maxButtons - 1);
        if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);

        function addBtn(p) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "btn btn-sm mx-1 page-number";
            btn.textContent = p;
            btn.classList.add(p === currentPage ? "btn-primary" : "btn-outline-primary");
            btn.addEventListener("click", () => loadFilteredAccounts(p));
            container.appendChild(btn);
        }

        function addEllipsis() {
            const span = document.createElement("span");
            span.className = "px-2 text-muted fw-bold";
            span.textContent = "...";
            container.appendChild(span);
        }

        if (start > 1) {
            addBtn(1);
            if (start > 2) addEllipsis();
        }

        for (let i = start; i <= end; i++) {
            addBtn(i);
        }

        if (end < totalPages) {
            if (end < totalPages - 1) addEllipsis();
            addBtn(totalPages);
        }
    }

    // Cập nhật trạng thái nút prev/next
    function updatePrevNextButtons(prevBtn, nextBtn) {
        if (!prevBtn || !nextBtn) return;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
        prevBtn.classList.toggle("disabled", currentPage === 1);
        nextBtn.classList.toggle("disabled", currentPage === totalPages);
    }

    // Hiệu ứng fade
    function animateTable() {
        if (!tableBody) return;
        tableBody.classList.remove("show");
        tableBody.classList.add("fade-soft");
        setTimeout(() => {
            tableBody.classList.add("show");
        }, 50);
    }

    // Sự kiện filter dropdown (nếu người dùng dùng dropdown)
    if (roleFilter) {
        roleFilter.addEventListener("change", function () {
            activeRole = this.value || "Tất Cả";
            roleTabs.forEach(t => {
                if (t.dataset.role === activeRole) t.classList.add("active");
                else t.classList.remove("active");
            });
            loadFilteredAccounts(1);
        });
    }

    // Sự kiện search
    if (searchBox) {
        searchBox.addEventListener("input", function () {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                loadFilteredAccounts(1);
            }, 300);
        });
    }

    // Sự kiện prev/next
    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            if (currentPage > 1) loadFilteredAccounts(currentPage - 1);
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            if (currentPage < totalPages) loadFilteredAccounts(currentPage + 1);
        });
    }

    // Load lần đầu & export hàm dùng chung
    window.loadFilteredAccounts = loadFilteredAccounts;
    window.loadAccounts = loadFilteredAccounts;
    loadFilteredAccounts(1);
});
