document.addEventListener("DOMContentLoaded", function () {
    const roleFilter = document.getElementById("roleFilter");
    const searchBox = document.getElementById("searchBox");
    const tableBody = document.getElementById("accountTableBody");
    const pageNumbers = document.getElementById("pageNumbers");
    const prevBtn = document.getElementById("prev");
    const nextBtn = document.getElementById("next");

    let currentPage = 1;
    const pageSize = 5;
    let searchTimeout = null; // để tránh gọi API liên tục khi gõ nhanh

    // Hàm load dữ liệu với filter + search
    function loadFilteredAccounts(page = 1) {
        const role = roleFilter.value;
        const search = searchBox.value.trim();

        fetch(`/Admin/Account/FilterSearchAccounts?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}&role=${encodeURIComponent(role)}`)
            .then(r => r.json())
            .then(res => {
                const data = res.data;
                currentPage = res.currentPage;
                tableBody.innerHTML = "";

                if (data.length === 0) {
                    tableBody.innerHTML = `
                        <tr class="no-data-row">
                            <td colspan="6" class="text-muted py-4">Không có dữ liệu</td>
                        </tr>`;
                    pageNumbers.innerHTML = "";
                    prevBtn.disabled = true;
                    nextBtn.disabled = true;
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
                            <button class="btn btn-sm btn-warning btn-edit me-1" data-id="${acc.TaiKhoan_id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger btn-delete me-1" data-id="${acc.TaiKhoan_id}" title="Xóa">
                                <i class="fas fa-trash"></i>
                            </button>
                            <button class="btn btn-sm btn-info btn-detail me-1 text-white" data-id="${acc.TaiKhoan_id}">
                                <i class="fas fa-info-circle"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary btn-reset" data-id="${acc.TaiKhoan_id}">
                                <i class="fas fa-key"></i>
                            </button>
                        </td>`;
                    tableBody.appendChild(row);
                });

                // Render nút số trang
                pageNumbers.innerHTML = "";
                for (let i = 1; i <= res.totalPages; i++) {
                    const btn = document.createElement("button");
                    btn.className = "btn btn-sm " + (i === res.currentPage ? "btn-primary" : "btn-outline-primary");
                    btn.textContent = i;
                    btn.addEventListener("click", () => loadFilteredAccounts(i));
                    pageNumbers.appendChild(btn);
                }

                prevBtn.disabled = res.currentPage <= 1;
                nextBtn.disabled = res.currentPage >= res.totalPages;
            })
            .catch(() => showToast("Không thể tải dữ liệu mới!", "error"));
    }

    // Sự kiện thay đổi filter
    roleFilter.addEventListener("change", () => loadFilteredAccounts(1));

    // Sự kiện nhập từ khóa tìm kiếm (tự động load khi gõ)
    searchBox.addEventListener("input", function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadFilteredAccounts(1);
        }, 300); // đợi 300ms sau khi ngừng gõ mới gọi API
    });

    // Sự kiện phân trang
    prevBtn.addEventListener("click", () => {
        if (currentPage > 1) loadFilteredAccounts(currentPage - 1);
    });
    nextBtn.addEventListener("click", () => {
        loadFilteredAccounts(currentPage + 1);
    });

    // Load lần đầu
    loadFilteredAccounts(1);
});
