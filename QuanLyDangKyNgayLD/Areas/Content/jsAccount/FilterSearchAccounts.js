document.addEventListener("DOMContentLoaded", function () {
    const roleFilter = document.getElementById("roleFilter");
    const searchBox = document.getElementById("searchBox");
    const tableBody = document.getElementById("accountTableBody");
    const pageNumbers = document.getElementById("pageNumbers");
    const prevBtn = document.getElementById("prev");
    const nextBtn = document.getElementById("next");
    const loading = document.getElementById("loadingIndicator");

    let currentPage = 1;
    const pageSize = 10;
    let totalPages = 1;
    let searchTimeout = null;

    // Hàm load dữ liệu với filter + search
    function loadFilteredAccounts(page = 1) {
        const role = roleFilter.value;
        const search = searchBox.value.trim();

        if (loading) loading.style.display = "block";
        animateTable();

        fetch(`/Admin/Account/FilterSearchAccounts?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}&role=${encodeURIComponent(role)}`)
            .then(r => r.json())
            .then(res => {
                const data = res.data;
                currentPage = res.currentPage;
                totalPages = res.totalPages || 1;
                tableBody.innerHTML = "";

                if (data.length === 0) {
                    tableBody.innerHTML = `
                        <tr class="no-data-row">
                            <td colspan="6" class="text-muted py-4">Không có dữ liệu</td>
                        </tr>`;
                    pageNumbers.innerHTML = "";
                    updatePrevNextButtons(prevBtn, nextBtn);
                    return;
                }

                data.forEach((acc, index) => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td class="stt-cell">${(currentPage - 1) * pageSize + index + 1}</td>
                        <td>${acc.Username}</td>
                        <td class="text-truncate" style="max-width:200px;" title="${acc.Email ?? ""}">
                            ${acc.Email ?? ""}
                        </td>
                        <td>${acc.RoleName ?? "Chưa có vai trò"}</td>
                        <td class="action-cell">
                            <button class="btn btn-sm btn-warning btn-edit me-1" data-id="${acc.TaiKhoan_id}"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-danger btn-delete me-1" data-id="${acc.TaiKhoan_id}"><i class="fas fa-trash"></i></button>
                            <button class="btn btn-sm btn-info btn-detail me-1 text-white" data-id="${acc.TaiKhoan_id}"><i class="fas fa-info-circle"></i></button>
                            <button class="btn btn-sm btn-secondary btn-reset" data-id="${acc.TaiKhoan_id}"><i class="fas fa-key"></i></button>
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

    // Render phân trang
    function renderPagination(container, currentPage, totalPages) {
        const fragment = document.createDocumentFragment();
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement("button");
            btn.className = "btn btn-sm me-1 page-number";
            btn.textContent = i;
            btn.classList.add(i === currentPage ? "btn-primary" : "btn-outline-primary");
            btn.addEventListener("click", () => loadFilteredAccounts(i));
            fragment.appendChild(btn);
        }
        container.innerHTML = "";
        container.appendChild(fragment);
    }

    // Cập nhật trạng thái nút prev/next
    function updatePrevNextButtons(prevBtn, nextBtn) {
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
        prevBtn.classList.toggle("disabled", currentPage === 1);
        nextBtn.classList.toggle("disabled", currentPage === totalPages);
    }

    // Hiệu ứng fade
    function animateTable() {
        tableBody.classList.remove("show");
        tableBody.classList.add("fade-soft");
        setTimeout(() => {
            tableBody.classList.add("show");
        }, 50);
    }

    // Sự kiện filter
    roleFilter.addEventListener("change", () => loadFilteredAccounts(1));

    // Sự kiện search
    searchBox.addEventListener("input", function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadFilteredAccounts(1);
        }, 300);
    });

    // Sự kiện prev/next
    prevBtn.addEventListener("click", () => {
        if (currentPage > 1) loadFilteredAccounts(currentPage - 1);
    });
    nextBtn.addEventListener("click", () => {
        if (currentPage < totalPages) loadFilteredAccounts(currentPage + 1);
    });

    // Load lần đầu
    loadFilteredAccounts(1);
});
