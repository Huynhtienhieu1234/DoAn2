document.addEventListener("DOMContentLoaded", function () {
    const deleteModal = document.getElementById("deleteModal");
    const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
    const deletedAccountsModal = document.getElementById("deletedAccountsModal");
    const tbodyDeleted = document.getElementById("deletedAccountsTableBody");
    const btnViewDeleted = document.getElementById("btnViewDeleted");
    const btnRefreshDeleted = document.getElementById("btnRefreshDeleted");

    let deleteId = null;
    let currentPage = 1;
    const pageSize = 10;

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
        const username = row?.children[2]?.textContent.trim() || "";
        const email = row?.children[3]?.textContent.trim() || "";

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
                    if (typeof window.loadAccountsAfterDelete === "function") {
                        window.loadAccountsAfterDelete(currentPage);
                    } else if (typeof loadAccounts === "function") {
                        loadAccounts(currentPage);
                    }
                } else {
                    showToast(res.message || "Xóa thất bại!", "error");
                }
            })
            .catch(() => showToast("Lỗi kết nối máy chủ!", "error"));
    });

    /* ==========================
       LOAD DANH SÁCH TÀI KHOẢN (AJAX)
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
                totalPages = res.totalPages || 1;

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
                        <td class="text-center"><input type="checkbox" class="form-check-input check-item-account" value="${acc.TaiKhoan_id}"></td>
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

                // Render phân trang gọn gàng
                pageNumbers.innerHTML = "";
                const totalPages = res.totalPages || 1;
                if (totalPages > 1) {
                    let start = Math.max(1, currentPage - 2);
                    let end = Math.min(totalPages, currentPage + 2);

                    if (currentPage <= 3) {
                        start = 1;
                        end = Math.min(totalPages, 5);
                    } else if (currentPage >= totalPages - 2) {
                        start = Math.max(1, totalPages - 4);
                        end = totalPages;
                    }

                    function addBtn(p) {
                        const btn = document.createElement("button");
                        btn.className = `btn btn-sm mx-1 ${p === currentPage ? "btn-primary active" : "btn-outline-primary"}`;
                        btn.textContent = p;
                        btn.addEventListener("click", () => loadAccounts(p));
                        pageNumbers.appendChild(btn);
                    }

                    function addEllipsis() {
                        const span = document.createElement("span");
                        span.className = "px-2 text-muted fw-bold page-ellipsis";
                        span.textContent = "...";
                        pageNumbers.appendChild(span);
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

                prevBtn.disabled = currentPage <= 1;
                nextBtn.disabled = currentPage >= res.totalPages;
            })
            .catch(err => {
                console.error("Lỗi tải dữ liệu tài khoản:", err);
            })
            .finally(() => {
                if (loading) loading.style.display = "none";
            });
    }

    // Nút phân trang nếu chưa có listener
    let totalPages = 1;
    window.loadAccountsAfterDelete = function(p) {
        if (typeof window.loadFilteredAccounts === "function") {
            window.loadFilteredAccounts(p || currentPage);
        } else {
            loadAccounts(p || currentPage);
        }
    };

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
    const checkAllDeletedAccounts = document.getElementById("checkAllDeletedAccounts");
    const btnDeletePermanentSelectedAccount = document.getElementById("btnDeletePermanentSelectedAccount");
    const btnRestoreSelectedAccount = document.getElementById("btnRestoreSelectedAccount");
    const selectedDeletedPermanentCount = document.getElementById("selectedDeletedPermanentCount");
    const selectedRestoreAccountCount = document.getElementById("selectedRestoreAccountCount");

    function updateDeletedAccountsSelection() {
        const checkedItems = document.querySelectorAll(".check-item-deleted-account:checked");
        const totalItems = document.querySelectorAll(".check-item-deleted-account");
        const count = checkedItems.length;

        if (selectedDeletedPermanentCount) selectedDeletedPermanentCount.textContent = count;
        if (selectedRestoreAccountCount) selectedRestoreAccountCount.textContent = count;

        if (btnDeletePermanentSelectedAccount) {
            btnDeletePermanentSelectedAccount.style.display = count > 0 ? "inline-flex" : "none";
        }
        if (btnRestoreSelectedAccount) {
            btnRestoreSelectedAccount.style.display = count > 0 ? "inline-flex" : "none";
        }

        if (checkAllDeletedAccounts) {
            checkAllDeletedAccounts.checked = totalItems.length > 0 && checkedItems.length === totalItems.length;
            checkAllDeletedAccounts.indeterminate = count > 0 && count < totalItems.length;
        }
    }

    // Sự kiện Chọn tất cả tài khoản đã xóa
    if (checkAllDeletedAccounts) {
        checkAllDeletedAccounts.addEventListener("change", function () {
            const isChecked = this.checked;
            document.querySelectorAll(".check-item-deleted-account").forEach(cb => {
                cb.checked = isChecked;
            });
            updateDeletedAccountsSelection();
        });
    }

    // Bắt sự kiện tick từng checkbox trong bảng tài khoản đã xóa
    document.addEventListener("change", function (e) {
        if (e.target && e.target.classList.contains("check-item-deleted-account")) {
            updateDeletedAccountsSelection();
        }
    });

    function loadDeletedAccounts() {
        if (!tbodyDeleted) return;
        tbodyDeleted.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Đang tải danh sách tài khoản đã xóa...</td></tr>`;
        if (checkAllDeletedAccounts) checkAllDeletedAccounts.checked = false;
        updateDeletedAccountsSelection();

        fetch("/Admin/Account/GetDeletedAccounts")
            .then(r => r.json())
            .then(res => {
                tbodyDeleted.innerHTML = "";
                if (!res || res.length === 0) {
                    tbodyDeleted.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Không có tài khoản nào trong thùng rác</td></tr>`;
                    updateDeletedAccountsSelection();
                    return;
                }
                res.forEach((acc, index) => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                    <td class="text-center">
                        <input type="checkbox" class="form-check-input check-item-deleted-account" value="${acc.TaiKhoan_id}">
                    </td>
                    <td class="text-center fw-bold">${index + 1}</td>
                    <td class="text-center fw-bold" style="white-space: nowrap;">${acc.Username || ""}</td>
                    <td class="text-center" style="white-space: nowrap; max-width: 260px; overflow: hidden; text-overflow: ellipsis;" title="${acc.Email || ''}">${acc.Email || "-"}</td>
                    <td class="text-center" style="white-space: nowrap;">${acc.RoleName || "N/A"}</td>
                    <td class="text-center" style="white-space: nowrap;">${parseDotNetDate(acc.DeletedAt)}</td>
                    <td class="text-center" style="white-space: nowrap;">
                        <div class="d-inline-flex gap-1 justify-content-center align-items-center">
                            <button class="btn btn-sm btn-success btn-restore px-2 py-1 fw-bold" data-id="${acc.TaiKhoan_id}" title="Khôi phục tài khoản">
                                <i class="fas fa-undo me-1"></i> Khôi phục
                            </button>
                            <button class="btn btn-sm btn-danger btn-delete-permanent px-2 py-1 fw-bold" data-id="${acc.TaiKhoan_id}" title="Xóa hẳn vĩnh viễn">
                                <i class="fas fa-trash-alt me-1"></i> Xóa hẳn
                            </button>
                        </div>
                    </td>`;

                    // Cho phép click vào dòng để tick/untick checkbox
                    row.addEventListener("click", function (e) {
                        if (e.target.closest("button") || e.target.closest("a") || e.target.closest(".form-check-input")) return;
                        const cb = this.querySelector(".check-item-deleted-account");
                        if (cb) {
                            cb.checked = !cb.checked;
                            updateDeletedAccountsSelection();
                        }
                    });

                    tbodyDeleted.appendChild(row);
                });
                updateDeletedAccountsSelection();
            })
            .catch(() => {
                tbodyDeleted.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Lỗi tải dữ liệu đã xóa!</td></tr>`;
                updateDeletedAccountsSelection();
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

    // Khôi phục đơn lẻ 1 tài khoản
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
                    if (typeof window.loadFilteredAccounts === "function") {
                        window.loadFilteredAccounts(currentPage);
                    } else {
                        loadAccounts(currentPage);
                    }
                } else {
                    showToast(res.message, "error");
                }
            })
            .catch(() => showToast("Lỗi khôi phục!", "error"));
    });

    // Khôi phục HÀNG LOẠT tài khoản đã chọn
    if (btnRestoreSelectedAccount) {
        btnRestoreSelectedAccount.addEventListener("click", function () {
            const checkedBoxes = document.querySelectorAll(".check-item-deleted-account:checked");
            const ids = Array.from(checkedBoxes).map(cb => parseInt(cb.value));

            if (ids.length === 0) {
                showToast("Vui lòng chọn ít nhất một tài khoản để khôi phục!", "warning");
                return;
            }

            fetch("/Admin/Account/RestoreMultipleAjax", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-RequestVerificationToken": document.querySelector('input[name="__RequestVerificationToken"]').value
                },
                body: JSON.stringify({ ids: ids })
            })
                .then(r => r.json())
                .then(res => {
                    if (res.success) {
                        showToast(res.message, "success");
                        loadDeletedAccounts();
                        if (typeof window.loadFilteredAccounts === "function") {
                            window.loadFilteredAccounts(currentPage);
                        } else {
                            loadAccounts(currentPage);
                        }
                    } else {
                        showToast(res.message, "error");
                    }
                })
                .catch(() => showToast("Lỗi kết nối khi khôi phục hàng loạt!", "error"));
        });
    }

    // Xóa hẳn HÀNG LOẠT tài khoản đã chọn (vĩnh viễn)
    if (btnDeletePermanentSelectedAccount) {
        btnDeletePermanentSelectedAccount.addEventListener("click", function () {
            const checkedBoxes = document.querySelectorAll(".check-item-deleted-account:checked");
            const ids = Array.from(checkedBoxes).map(cb => parseInt(cb.value));

            if (ids.length === 0) {
                showToast("Vui lòng chọn ít nhất một tài khoản để xóa hẳn!", "warning");
                return;
            }

            showCustomDeleteModal({
                id: ids.join(", "),
                username: `(${ids.length} tài khoản đã chọn)`,
                email: "Hành động này sẽ XÓA HẲN VĨNH VIỄN toàn bộ tài khoản và dữ liệu liên quan!",
                isPermanent: true,
                onConfirm: () => {
                    fetch("/Admin/Account/DeletePermanentMultipleAjax", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-RequestVerificationToken": document.querySelector('input[name="__RequestVerificationToken"]').value
                        },
                        body: JSON.stringify({ ids: ids })
                    })
                        .then(r => r.json())
                        .then(res => {
                            if (res.success) {
                                showToast(res.message, "success");
                                const modalInstance = bootstrap.Modal.getInstance(document.getElementById("customDeleteModal"));
                                if (modalInstance) modalInstance.hide();
                                loadDeletedAccounts();
                            } else {
                                showToast(res.message || "Xóa hẳn hàng loạt thất bại!", "error");
                            }
                        })
                        .catch(err => {
                            console.error("Lỗi xóa hẳn hàng loạt:", err);
                            showToast("Lỗi kết nối máy chủ!", "error");
                        });
                }
            });
        });
    }

    function showCustomDeleteModal({ id, username, email, isPermanent = false, onConfirm }) {
        document.getElementById("customDeleteTitle").textContent = isPermanent
            ? "⚠️ CẢNH BÁO: XÓA HẲN VĨNH VIỄN"
            : "Bạn có chắc muốn xóa tài khoản này?";

        document.getElementById("customDeleteInfo").textContent =
            `Danh sách ID: ${id}` +
            (username ? ` • ${username}` : "") +
            (email ? ` • ${email}` : "");

        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("customDeleteModal"));
        modal.show();

        const confirmBtn = document.getElementById("customDeleteConfirmBtn");
        const clone = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(clone, confirmBtn);

        clone.addEventListener("click", function () {
            modal.hide();
            if (typeof onConfirm === "function") onConfirm();
        });
    }

    // Xóa hẳn đơn lẻ vĩnh viễn (dùng modal riêng thay confirm)
    document.addEventListener("click", e => {
        const btn = e.target.closest(".btn-delete-permanent");
        if (!btn) return;

        const id = btn.dataset.id;
        const row = btn.closest("tr");
        const username = row?.children[2]?.textContent.trim() || "";
        const email = row?.children[3]?.textContent.trim() || "";

        showCustomDeleteModal({
            id,
            username,
            email,
            isPermanent: true,
            onConfirm: () => {
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
                            const msg = res.username
                                ? `Đã xóa hẳn tài khoản '${res.username}' khỏi hệ thống.`
                                : res.message;
                            showToast(msg, "success");
                            
                            const modalInstance = bootstrap.Modal.getInstance(document.getElementById("customDeleteModal"));
                            if (modalInstance) modalInstance.hide();

                            loadDeletedAccounts();
                        } else {
                            showToast(res.message || "Xóa thất bại!", "error");
                        }
                    })
                    .catch(err => {
                        console.error("Lỗi xóa vĩnh viễn:", err);
                        showToast("Lỗi xóa vĩnh viễn!", "error");
                    });
            }
        });
    });

});