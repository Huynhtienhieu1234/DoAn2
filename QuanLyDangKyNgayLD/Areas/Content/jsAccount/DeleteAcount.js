document.addEventListener("DOMContentLoaded", function () {
    const deleteModal = document.getElementById("deleteModal");
    const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
    const deletedAccountsModal = document.getElementById("deletedAccountsModal");
    const tbodyDeleted = document.getElementById("deletedAccountsTableBody");
    const btnViewDeleted = document.getElementById("btnViewDeleted");
    const btnRefreshDeleted = document.getElementById("btnRefreshDeleted");

    let deleteId = null;
    let currentPage = 1;
    const pageSize = 5;

    /* ==========================
       HÀM ĐỊNH DẠNG NGÀY GIỜ TIẾNG VIỆT ĐẸP
       ========================== */
    function formatDateVN(dateString) {
        const date = new Date(dateString);
        if (isNaN(date)) return "Chưa xác định";
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        // Kết quả: 11/12/2025 11:49
    }

    /* ==========================
       MỞ MODAL XÓA KHI BẤM NÚT THÙNG RÁC
       ========================== */
    document.addEventListener("click", function (e) {
        const btn = e.target.closest(".btn-delete");
        if (!btn) return;

        deleteId = btn.dataset.id;
        const row = btn.closest("tr");
        const username = row?.children[1]?.textContent.trim() || "";
        const email = row?.children[2]?.textContent.trim() || "";

        document.getElementById("deleteConfirmText").textContent = "Bạn có chắc muốn xóa tài khoản này?";
        document.getElementById("deleteAccountInfo").textContent =
            `ID: ${deleteId}` +
            (username ? ` • Tài khoản: ${username}` : "") +
            (email ? ` • Email: ${email}` : "");

        const modal = bootstrap.Modal.getOrCreateInstance(deleteModal);
        modal.show();
    });

    /* ==========================
       XÁC NHẬN XÓA MỀM
       ========================== */
    confirmDeleteBtn.addEventListener("click", function () {
        if (!deleteId) return;

        fetch("/Admin/Account/DeleteAjax", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-RequestVerificationToken": document.querySelector('input[name="__RequestVerificationToken"]').value
            },
            body: JSON.stringify({ id: deleteId })
        })
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    showToast(res.message, "success");
                    bootstrap.Modal.getInstance(deleteModal).hide();
                    loadAccounts(currentPage);
                } else {
                    showToast(res.message || "Xóa thất bại!", "error");
                }
            })
            .catch(() => showToast("Lỗi kết nối đến server!", "error"));
    });

    /* ==========================
       LOAD DANH SÁCH TÀI KHOẢN + PHÂN TRANG
       ========================== */
    function loadAccounts(page = 1) {
        const loading = document.getElementById("loadingIndicator");
        const tableBody = document.getElementById("accountTableBody");
        const pageNumbers = document.getElementById("pageNumbers");
        const prevBtn = document.getElementById("prev");
        const nextBtn = document.getElementById("next");

        if (loading) loading.style.display = "block";
        animateTable();

        fetch(`/Admin/Account/GetAccounts?page=${page}&pageSize=${pageSize}`)
            .then(r => r.json())
            .then(res => {
                const data = res.data || [];
                currentPage = res.currentPage || 1;

                tableBody.innerHTML = "";
                if (data.length === 0) {
                    tableBody.innerHTML = `<tr class="no-data-row"><td colspan="6" class="text-muted py-4 text-center">Không có dữ liệu</td></tr>`;
                    pageNumbers.innerHTML = "";
                    prevBtn.disabled = true;
                    nextBtn.disabled = true;
                    return;
                }

                data.forEach((acc, index) => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td class="stt-cell text-center">${(currentPage - 1) * pageSize + index + 1}</td>
                        <td>${acc.Username || ""}</td>
                        <td class="text-truncate" style="max-width:200px;" title="${acc.Email ?? ""}">${acc.Email ?? ""}</td>
                        <td>${acc.RoleName || "Chưa có vai trò"}</td>
                        <td class="action-cell text-center">
                            <button class="btn btn-sm btn-warning btn-edit me-1" data-id="${acc.TaiKhoan_id}" title="Sửa">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger btn-delete me-1" data-id="${acc.TaiKhoan_id}" title="Xóa mềm">
                                <i class="fas fa-trash"></i>
                            </button>
                            <button class="btn btn-sm btn-info btn-detail me-1 text-white" data-id="${acc.TaiKhoan_id}" title="Xem chi tiết">
                                <i class="fas fa-info-circle"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary btn-reset" data-id="${acc.TaiKhoan_id}" title="Đặt lại mật khẩu">
                                <i class="fas fa-key"></i>
                            </button>
                        </td>`;
                    tableBody.appendChild(row);
                });

                // Render phân trang
                pageNumbers.innerHTML = "";
                for (let i = 1; i <= res.totalPages; i++) {
                    const btn = document.createElement("button");
                    btn.className = `btn btn-sm mx-1 ${i === currentPage ? "btn-primary" : "btn-outline-primary"}`;
                    btn.textContent = i;
                    btn.addEventListener("click", () => loadAccounts(i));
                    pageNumbers.appendChild(btn);
                }

                prevBtn.disabled = currentPage <= 1;
                nextBtn.disabled = currentPage >= res.totalPages;
            })
            .catch(() => {
                showToast("Không thể tải dữ liệu!", "error");
                tableBody.innerHTML = `<tr><td colspan="6" class="text-danger text-center py-4">Lỗi tải dữ liệu</td></tr>`;
            })
            .finally(() => {
                if (loading) loading.style.display = "none";
            });
    }

    // Nút phân trang
    document.getElementById("prev").addEventListener("click", () => {
        if (currentPage > 1) loadAccounts(currentPage - 1);
    });

    document.getElementById("next").addEventListener("click", () => {
        if (currentPage < res.totalPages) loadAccounts(currentPage + 1);
    });

    // Load lần đầu
    loadAccounts(1);

    /* ==========================
       HIỆU ỨNG KHI LOAD BẢNG
       ========================== */
    function animateTable() {
        const tableBody = document.getElementById("accountTableBody");
        tableBody.classList.remove("show");
        tableBody.classList.add("table-soft");

        setTimeout(() => {
            tableBody.classList.add("show");
        }, 50); // delay nhỏ để kích hoạt transition
    }

    function parseDotNetDate(dotNetDate) {
        if (!dotNetDate) return "Chưa xác định";

        const match = /\/Date\((\d+)\)\//.exec(dotNetDate);
        if (!match) return "Chưa xác định";

        const timestamp = parseInt(match[1]);
        const d = new Date(timestamp);

        if (isNaN(d.getTime())) return "Chưa xác định";

        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();

        return `${day}/${month}/${year}`;
    }


    /* ==========================
       MODAL DANH SÁCH TÀI KHOẢN ĐÃ XÓA
       ========================== */
    function loadDeletedAccounts() {
        tbodyDeleted.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Đang tải...</td></tr>`;

        fetch("/Admin/Account/GetDeletedAccounts")
            .then(r => r.json())
            .then(res => {
                tbodyDeleted.innerHTML = "";
                if (!res || res.length === 0) {
                    tbodyDeleted.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Không có tài khoản nào đã xóa</td></tr>`;
                    return;
                }
                res.forEach((acc, index) => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                    <td class="text-center">${index + 1}</td>
                    <td>${acc.Username || ""}</td>
                    <td>${acc.Email || ""}</td>
                    <td class="text-center">${acc.RoleName || ""}</td>
                    <td class="text-center">
                          ${parseDotNetDate(acc.DeletedAt)}

                    </td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-success btn-restore me-1" data-id="${acc.TaiKhoan_id}">
                            Khôi phục
                        </button>
                        <button class="btn btn-sm btn-danger btn-delete-permanent" data-id="${acc.TaiKhoan_id}">
                            Xóa hẳn
                        </button>
                    </td>`;
                    tbodyDeleted.appendChild(row);
                });
            })
            .catch(() => {
                tbodyDeleted.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Lỗi tải dữ liệu đã xóa!</td></tr>`;
            });
    }

    // Mở modal tài khoản đã xóa
    if (btnViewDeleted) {
        btnViewDeleted.addEventListener("click", () => {
            loadDeletedAccounts();
            const modal = bootstrap.Modal.getOrCreateInstance(deletedAccountsModal);
            modal.show();
        });
    }

    if (btnRefreshDeleted) {
        btnRefreshDeleted.addEventListener("click", loadDeletedAccounts);
    }

    // Khôi phục tài khoản
    document.addEventListener("click", e => {
        const btn = e.target.closest(".btn-restore");
        if (!btn) return;

        const id = btn.dataset.id;
        fetch("/Admin/Account/RestoreAjax", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-RequestVerificationToken": document.querySelector('input[name="__RequestVerificationToken"]').value
            },
            body: JSON.stringify({ id })
        })
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    showToast(res.message, "success");
                    loadDeletedAccounts();
                    loadAccounts(currentPage);
                } else {
                    showToast(res.message, "error");
                }
            })
            .catch(() => showToast("Lỗi khôi phục!", "error"));
    });

    // Xóa hẳn vĩnh viễn
    document.addEventListener("click", e => {
        const btn = e.target.closest(".btn-delete-permanent");
        if (!btn) return;

        if (!confirm("Bạn có chắc muốn XÓA HẲN tài khoản này?\nHành động này KHÔNG THỂ HOÀN TÁC!")) return;

        const id = btn.dataset.id;
        fetch("/Admin/Account/DeletePermanentAjax", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-RequestVerificationToken": document.querySelector('input[name="__RequestVerificationToken"]').value
            },
            body: JSON.stringify({ id })
        })
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    showToast(res.message, "success");
                    loadDeletedAccounts();
                } else {
                    showToast(res.message, "error");
                }
            })
            .catch(() => showToast("Lỗi xóa vĩnh viễn!", "error"));
    });
});