// ~/Areas/Content/jsAccount/Account.js
// PHIÊN BẢN ĐÃ DỌN SẠCH & PHÂN VÙNG RÕ RÀNG - DỄ BẢO TRÌ 2025

document.addEventListener("DOMContentLoaded", function () {

    // ==================================================================
    // 1. BIẾN TOÀN CỤC BỘ (STATE)
    // ==================================================================
    let currentEditData = null;   // Dùng khi sửa tài khoản (lưu dữ liệu cũ để kiểm tra thay đổi)
    let currentDeleteId = null;   // ID tài khoản đang chuẩn bị xóa
    let currentResetId = null;      // ID tài khoản đang đặt lại mật khẩu

    let currentPage = 1;          // Trang hiện tại của phân trang
    const pageSize = 5;           // Số dòng mỗi trang

    // ==================================================================
    // 2. GỌI KHỞI TẠO CHÍNH
    // ==================================================================
    setupEventListeners();   // Gắn tất cả sự kiện
    loadAccounts();          // Load dữ liệu bảng lần đầu tiên (server-side)

    // ==================================================================
    // 3. GẮN SỰ KIỆN (EVENT LISTENERS)
    // ==================================================================
    function setupEventListeners() {

        // ---- Toolbar buttons ----
        document.getElementById("btnAdd")?.addEventListener("click", handleAddAccount);
        document.getElementById("btnViewDeleted")?.addEventListener("click", handleViewDeleted);
        document.getElementById("btnRefreshDeleted")?.addEventListener("click", loadDeletedAccounts);
        document.getElementById("exportAllAccounts")?.addEventListener("click", exportAllAccounts);




        // === THÊM 2 DÒNG NÀY VÀO CUỐI setupEventListeners() ===
        document.getElementById("createForm")?.addEventListener("submit", handleCreateSubmit);
        document.querySelector("#createModal .btn-success")?.addEventListener("click", () => {
            document.getElementById("createForm").dispatchEvent(new Event("submit"));
        });
        // ---- Form & Confirm buttons ----
        document.getElementById('editForm')?.addEventListener('submit', handleEditSubmit);
        document.getElementById('confirmDeleteBtn')?.addEventListener('click', handleConfirmDelete);
        document.getElementById('confirmResetBtn')?.addEventListener('click', handleConfirmReset);

        // ---- Khi mở modal tài khoản đã xóa → tự động load ----
        document.getElementById('deletedAccountsModal')?.addEventListener('shown.bs.modal', loadDeletedAccounts);

        // ---- Bảng chính: dùng event delegation để xử lý các nút hành động ----
        document.getElementById("accountTableBody")?.addEventListener("click", function (e) {
            const btn = e.target.closest("button");
            if (!btn) return;

            if (btn.classList.contains("btn-detail")) handleDetail.call(btn);
            else if (btn.classList.contains("btn-edit")) handleEdit.call(btn);
            else if (btn.classList.contains("btn-delete")) handleDelete.call(btn);
            else if (btn.classList.contains("btn-reset")) handleResetPassword.call(btn);
        });

        // ---- Bảng tài khoản đã xóa: nút khôi phục ----
        document.getElementById("deletedAccountsTableBody")?.addEventListener("click", function (e) {
            const btn = e.target.closest(".btn-restore");
            if (btn) handleRestoreAccount.call(btn);
        });

        // ---- Reset state khi đóng modal ----
        document.getElementById('editModal')?.addEventListener('hidden.bs.modal', () => currentEditData = null);
        document.getElementById('deleteModal')?.addEventListener('hidden.bs.modal', () => currentDeleteId = null);
        document.getElementById('resetPasswordModal')?.addEventListener('hidden.bs.modal', () => currentResetId = null);

        // ---- Lọc theo vai trò ----
        document.getElementById("roleFilter")?.addEventListener("change", () => {
            currentPage = 1;
            loadAccounts();
        });

        // ---- Tìm kiếm (search box) ----
        const searchBox = document.getElementById("searchBox");
        if (searchBox) {
            searchBox.addEventListener("input", () => {
                currentPage = 1;
                loadAccounts();
            });
        }
    }

    // ==================================================================
    // 4. XỬ LÝ THÊM MỚI TÀI KHOẢN
    // ==================================================================
    function handleAddAccount() {
        const form = document.getElementById("createForm");
        if (form) form.reset(); // reset form thêm mới
        showModal("createModal"); // mở modal thêm mới
    }
    function handleCreateSubmit(e) {
        e.preventDefault();
        const form = this;
        const btn = document.querySelector("#createModal .btn-success"); // nút Lưu

        // Kiểm tra hợp lệ trước khi gửi
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        const token = form.querySelector('input[name="__RequestVerificationToken"]')?.value;

        if (!token) {
            showToast("Thiếu token bảo mật!", "error");
            return;
        }

        showLoading(btn, "Đang thêm...");

        fetch(form.action, {

            method: "POST",
            body: formData,
            headers: {
                "X-RequestVerificationToken": token
            }



        })
            .then(response => {
                if (!response.ok) throw new Error("Phản hồi không hợp lệ từ server");
                return response.json();
            })
            .then(data => {
                console.log("Server response:", data);
                if (data.success) {
                    hideModal("createModal");
                    form.reset();
                    showToast(data.message || "Thêm tài khoản thành công!", "success");
                    loadAccounts(currentPage);
                } else {
                    showToast(data.message || "Thêm thất bại!", "error");
                }
            })
            .catch(error => {
                console.error("Lỗi gửi dữ liệu:", error);
                showToast("Lỗi: Không thể gửi dữ liệu!", "error");
            })
            .finally(() => {
                resetButton(btn, "Lưu", '<i class="fa fa-check me-1"></i>');
            });
    }



    // ==================================================================
    // 5. XỬ LÝ CHỈNH SỬA TÀI KHOẢN
    // ==================================================================

    // Gắn sự kiện cho nút sửa
    document.addEventListener("DOMContentLoaded", function () {
        document.querySelectorAll(".btn-edit").forEach(btn => {
            btn.addEventListener("click", handleEdit);
        });

        const editForm = document.getElementById("editForm");
        if (editForm) {
            editForm.addEventListener("submit", handleEditSubmit);
        }
    });

    // Mở modal và gán dữ liệu vào form
    function handleEdit() {
        const btn = this;
        currentEditData = {
            id: btn.dataset.id,
            username: btn.dataset.username,
            email: btn.dataset.email,
            roleId: btn.dataset.roleid,
            roleName: btn.dataset.rolename
        };

        document.getElementById("editId").value = currentEditData.id;
        document.getElementById("editUsername").value = currentEditData.username;
        document.getElementById("editEmail").value = currentEditData.email;
        document.getElementById("editRole").value = currentEditData.roleId;
        document.getElementById("editPassword").value = "";

        showModal("editModal");
    }

    // Kiểm tra có thay đổi không
    function hasChanges() {
        const username = document.getElementById("editUsername").value;
        const email = document.getElementById("editEmail").value;
        const roleId = document.getElementById("editRole").value;
        const password = document.getElementById("editPassword").value;

        return (
            username !== currentEditData.username ||
            email !== currentEditData.email ||
            roleId !== currentEditData.roleId ||
            password.trim() !== ""
        );
    }

    // Gửi form chỉnh sửa bằng AJAX
    function handleEditSubmit(e) {
        e.preventDefault();

        if (document.getElementById("editId").value && !hasChanges()) {
            showToast('Không có thay đổi nào để lưu!', 'info');
            return;
        }

        const form = e.target;
        const formData = new FormData(form);
        const btn = form.querySelector('button[type="submit"]');
        showLoading(btn, 'Đang lưu...');

        fetch(form.action, {
            method: 'POST',
            body: formData
        })
            .then(r => r.json())
            .then(data => {
                hideModal("editModal");
                showToast(data.success ? data.message : data.message, data.success ? "success" : "error");

                if (data.success) {
                    // Nếu muốn cập nhật bảng mà không reload, có thể viết thêm ở đây
                    setTimeout(() => location.reload(), 1000);
                }
            })
            .catch(() => {
                showToast("Lỗi kết nối!", "error");
            })
            .finally(() => {
                resetButton(btn, 'Lưu thay đổi', '<i class="fa fa-save me-1"></i>');
            });
    }

    // ================== HÀM HỖ TRỢ ==================

    // Mở modal
    function showModal(id) {
        const modal = new bootstrap.Modal(document.getElementById(id));
        modal.show();
    }

    // Ẩn modal
    function hideModal(id) {
        const modalEl = document.getElementById(id);
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }

    // Hiển thị loading trên nút
    function showLoading(btn, text) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>${text}`;
    }

    // Reset nút sau khi gửi
    function resetButton(btn, text, iconHtml = "") {
        btn.disabled = false;
        btn.innerHTML = `${iconHtml}${text}`;
    }



    // ==================================================================
    // 5. XỬ LÝ XÓA TÀI KHOẢN
    // ==================================================================
    function handleDelete() {
        const row = this.closest("tr");
        currentDeleteId = this.dataset.id;

        document.getElementById('deleteConfirmText').textContent = `Bạn có chắc chắn muốn xóa tài khoản "${row.cells[1].textContent}"?`;
        document.getElementById('deleteAccountInfo').innerHTML = `<strong>${row.cells[1].textContent}</strong><br>${row.cells[2].textContent}<br><span class="badge bg-secondary">${row.cells[3].textContent}</span>`;

        showModal('deleteModal');
    }

    function handleConfirmDelete() {
        if (!currentDeleteId) return;
        const btn = this;
        showLoading(btn, 'Đang xóa...');

        const fd = new FormData();
        fd.append('id', currentDeleteId);

        fetch('/Admin/Account/DeleteAjax', { method: 'POST', body: fd })
            .then(r => r.json())
            .then(data => {
                hideModal('deleteModal');
                showToast(data.success ? "Xóa thành công!" : data.message, data.success ? "success" : "error");
                if (data.success) setTimeout(() => location.reload(), 1000);
            })
            .catch(() => showToast("Lỗi kết nối!", "error"))
            .finally(() => resetButton(btn, 'Xác nhận xóa', '<i class="fas fa-trash me-1"></i>'));
    }

    // ==================================================================
    // 6. XỬ LÝ ĐẶT LẠI MẬT KHẨU
    // ==================================================================
    function handleResetPassword() {
        const row = this.closest("tr");
        currentResetId = this.dataset.id;

        document.getElementById('resetCurrentUsername').textContent = row.cells[1].textContent;
        document.getElementById('resetCurrentEmail').textContent = row.cells[2].textContent;
        document.getElementById('resetCurrentRole').textContent = row.cells[3].textContent;

        showModal('resetPasswordModal');
    }

    function handleConfirmReset() {
        if (!currentResetId) return;
        const btn = this;
        showLoading(btn, 'Đang xử lý...');

        const fd = new FormData();
        fd.append('id', currentResetId);

        fetch('/Admin/Account/ResetPasswordAjax', { method: 'POST', body: fd })
            .then(r => r.json())
            .then(data => {
                hideModal('resetPasswordModal');
                showToast(data.success ? "Đặt lại mật khẩu thành công!" : data.message, data.success ? "success" : "error");
                if (data.success) setTimeout(() => location.reload(), 1000);
            })
            .catch(() => showToast("Lỗi kết nối!", "error"))
            .finally(() => resetButton(btn, 'Đặt lại mật khẩu', '<i class="fas fa-redo me-1"></i>'));
    }

    // ==================================================================
    // 7. CÁC CHỨC NĂNG PHỤ (CHI TIẾT, XUẤT EXCEL, KHÔI PHỤC...)
    // ==================================================================
    function handleDetail() {
        const row = this.closest("tr");
        document.getElementById("detailId").textContent = this.dataset.id;
        document.getElementById("detailUsername").textContent = row.cells[1].textContent;
        document.getElementById("detailEmail").textContent = row.cells[2].textContent;
        document.getElementById("detailRole").textContent = row.cells[3].textContent;
        showModal("detailModal");
    }

    function handleViewDeleted() {
        showModal("deletedAccountsModal");
    }

    function loadDeletedAccounts() {
        const tb = document.getElementById("deletedAccountsTableBody");
        const btn = document.getElementById("btnRefreshDeleted");
        if (!tb || !btn) return;

        showLoading(btn, 'Đang tải...');
        tb.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Đang tải...</td></tr>';

        fetch('/Admin/Account/GetDeletedAccounts')
            .then(r => r.json())
            .then(data => {
                tb.innerHTML = (data.success && data.accounts?.length)
                    ? renderDeletedHtml(data.accounts)
                    : '<tr><td colspan="6" class="text-center text-muted py-4">Không có tài khoản đã xóa</td></tr>';
            })
            .catch(() => {
                tb.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Lỗi tải dữ liệu</td></tr>';
            })
            .finally(() => resetButton(btn, 'Làm mới', '<i class="fas fa-sync-alt me-1"></i>'));
    }

    function renderDeletedHtml(accounts) {
        return accounts.map((a, i) => {
            const su = a.username.length > 15 ? a.username.substr(0, 15) + '...' : a.username;
            const se = a.email.length > 20 ? a.email.substr(0, 20) + '...' : a.email;
            return `<tr>
                <td class="text-center">${i + 1}</td>
                <td title="${a.username}"><div class="fw-bold">${su}</div></td>
                <td title="${a.email}">${se}</td>
                <td class="text-center"><span class="badge bg-secondary">${a.roleName || 'N/A'}</span></td>
                <td class="text-center">${formatDateShort(a.deletedAt)}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-success btn-restore" data-id="${a.id}">
                        <i class="fas fa-trash-restore"></i> Khôi phục
                    </button>
                </td>
            </tr>`;
        }).join('');
    }

    function handleRestoreAccount() {
        if (!confirm('Khôi phục tài khoản này?')) return;
        const id = this.dataset.id;
        const row = this.closest("tr");
        showLoading(this, 'Đang khôi phục...');

        fetch('/Admin/Account/RestoreAccount', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        })
            .then(r => r.json())
            .then(d => {
                if (d.success) {
                    showToast(d.message || "Khôi phục thành công!", "success");
                    row.remove();
                    setTimeout(() => location.reload(), 1000);
                } else {
                    showToast(d.message || "Lỗi!", "error");
                }
            })
            .catch(() => showToast("Lỗi kết nối!", "error"));
    }
    function handleExportExcel() {
        const rows = Array.from(document.querySelectorAll("#accountTableBody tr:not(.no-data-row)"));
        if (rows.length === 0) return showToast("Không có dữ liệu để xuất!", "warning");

        let html = `<table border="1"><thead><tr>
        <th>STT</th><th>Tên Tài Khoản</th><th>Email</th><th>Loại Tài Khoản</th>
    </tr></thead><tbody>`;

        rows.forEach((r, i) => {
            html += `<tr>
            <td>${i + 1}</td>
            <td>${r.cells[1].textContent}</td>
            <td>${r.cells[2].textContent}</td>
            <td>${r.cells[3].textContent}</td>
        </tr>`;
        });

        html += `</tbody></table>`;

        const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `DanhSachTaiKhoan_${new Date().toISOString().slice(0, 10)}.xls`;

        // Theo dõi trạng thái tab
        let tabHidden = false;
        const onVisibilityChange = () => {
            tabHidden = document.visibilityState === "hidden";
        };
        document.addEventListener("visibilitychange", onVisibilityChange);

        // Bắt đầu tải
        a.click();
        URL.revokeObjectURL(url);

        // Kiểm tra sau 2 giây
        setTimeout(() => {
            document.removeEventListener("visibilitychange", onVisibilityChange);
            if (tabHidden) {
                showToast("Xuất Excel thành công!", "success");
            } else {
                showToast("Xuất không thành công hoặc bị hủy!", "error");
            }
        }, 2000);
    }




    // ==================================================================
    // 8. PHÂN TRANG SERVER-SIDE + TẢI DỮ LIỆU BẢNG
    // ==================================================================
    function loadAccounts(page = 1) {
        const role = document.getElementById("roleFilter")?.value || "";
        const keyword = document.getElementById("searchBox")?.value?.trim() || "";
        const tb = document.getElementById("accountTableBody");

        if (tb) {
            tb.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4"><i class="fa fa-spinner fa-spin"></i> Đang tải dữ liệu...</td></tr>';
        }

        fetch(`/Account/LoadAccounts?page=${page}&pageSize=${pageSize}&role=${encodeURIComponent(role)}&keyword=${encodeURIComponent(keyword)}`)
            .then(r => r.json())
            .then(data => {
                // Truyền page vào để render số thứ tự chính xác
                renderAccountTable(data.items || [], page);
                setupPagination(data.page || 1, data.totalPages || 1);
            })
            .catch(err => {
                console.error(err);
                if (tb) tb.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Lỗi tải dữ liệu</td></tr>';
            });
    }
    function renderAccountTable(items, page) {
        const tb = document.getElementById("accountTableBody");
        if (!tb) return;

        tb.classList.remove("fade-in");
        tb.classList.add("fade-out");

        setTimeout(() => {
            if (items.length === 0) {
                tb.innerHTML = '<tr class="no-data-row"><td colspan="6" class="text-center text-muted py-4">Không có dữ liệu</td></tr>';
            } else {
                tb.innerHTML = '';
                items.forEach((a, i) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                    <td class="text-center">${(page - 1) * pageSize + i + 1}</td>
                    <td>${a.Username}</td>
                    <td class="text-truncate" style="max-width:200px;" title="${a.Email}">${a.Email}</td>
                    <td><span class="badge bg-secondary">${a.RoleName || "Chưa có vai trò"}</span></td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-warning btn-edit me-1"
                                data-id="${a.TaiKhoan_id}"
                                data-username="${a.Username}"
                                data-email="${a.Email}"
                                data-roleid="${a.VaiTro_id}"
                                data-rolename="${a.RoleName}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger btn-delete me-1" data-id="${a.TaiKhoan_id}">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="btn btn-sm btn-info btn-detail me-1 text-white" data-id="${a.TaiKhoan_id}">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        <button class="btn btn-sm btn-reset" style="background: linear-gradient(135deg, #667eea, #764ba2); color:white;" data-id="${a.TaiKhoan_id}">
                            <i class="fas fa-key"></i>
                        </button>
                    </td>
                `;
                    tb.appendChild(tr);
                });

                tb.querySelectorAll(".btn-edit").forEach(btn => btn.onclick = handleEdit);
                tb.querySelectorAll(".btn-delete").forEach(btn => btn.onclick = handleDelete);
                tb.querySelectorAll(".btn-detail").forEach(btn => btn.onclick = handleDetail);
                tb.querySelectorAll(".btn-reset").forEach(btn => btn.onclick = handleResetPassword);
            }

            tb.classList.remove("fade-out");
            tb.classList.add("fade-in");
        }, 200);
    }





    function setupPagination(page, totalPages) {
        const container = document.getElementById("pageNumbers");
        const prevBtn = document.getElementById("prev");
        const nextBtn = document.getElementById("next");

        if (!container) {
            console.warn("Không tìm thấy #pageNumbers trong DOM");
            return;
        }

        container.innerHTML = "";

        if (totalPages <= 1) {
            if (prevBtn) prevBtn.disabled = true;
            if (nextBtn) nextBtn.disabled = true;
            return;
        }

        // Nút Prev
        if (prevBtn) {
            prevBtn.disabled = page <= 1;
            prevBtn.onclick = () => gotoPageLocal(page - 1);
        }

        const maxButtons = 7;
        let start = Math.max(1, page - Math.floor(maxButtons / 2));
        let end = Math.min(totalPages, start + maxButtons - 1);
        if (end - start + 1 < maxButtons) {
            start = Math.max(1, end - maxButtons + 1);
        }

        if (start > 1) {
            addPageButton(1);
            if (start > 2) addEllipsis();
        }

        for (let i = start; i <= end; i++) {
            addPageButton(i);
        }

        if (end < totalPages) {
            if (end < totalPages - 1) addEllipsis();
            addPageButton(totalPages);
        }

        if (nextBtn) {
            nextBtn.disabled = page >= totalPages;
            nextBtn.onclick = () => gotoPageLocal(page + 1);
        }

        // ==== Hàm phụ ====
        function addPageButton(p) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "page-btn";
            btn.textContent = p;
            if (p === page) btn.classList.add("active");
            btn.addEventListener("click", () => {
                if (p !== page) {
                    gotoPageLocal(p);
                }
            });
            container.appendChild(btn);
        }

        function addEllipsis() {
            const span = document.createElement("span");
            span.className = "page-ellipsis";
            span.textContent = "...";
            container.appendChild(span);
        }

        // ==== Hàm gọi loadAccounts kèm filter ====
        function gotoPageLocal(p) {
            const keyword = document.getElementById("searchKeyword")?.value || "";
            const role = document.getElementById("filterRole")?.value || "";
            loadAccounts(p, keyword, role);
        }
    }


    // ==================================================================
    // 9. CÁC HÀM HỖ TRỢ (UTILITY)
    // ==================================================================
    function hasChanges() {
        if (!currentEditData) return true;
        return document.getElementById('editUsername').value !== currentEditData.username ||
            document.getElementById('editEmail').value !== currentEditData.email ||
            document.getElementById('editRole').value !== currentEditData.roleId ||
            document.getElementById('editPassword').value !== '';
    }
    function showModal(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        let instance = bootstrap.Modal.getInstance(modal);
        if (!instance) {
            instance = new bootstrap.Modal(modal);
        }
        instance.show();
    }


    function hideModal(id) {
        const modal = document.getElementById(id);
        if (modal) bootstrap.Modal.getInstance(modal)?.hide();
    }

    function showLoading(btn, text) {
        if (!btn) return;
        btn.dataset.original = btn.innerHTML;
        btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> ${text}`;
        btn.disabled = true;
    }

    function resetButton(btn, text, icon = '') {
        if (!btn) return;
        btn.innerHTML = btn.dataset.original || `${icon} ${text}`;
        btn.disabled = false;
    }

    function showToast(msg, type = 'info') {
        if (window.showToast) window.showToast(msg, type);
        else alert(msg);
    }




    function formatDateShort(dotNetDate) {
        if (!dotNetDate) return '';

        // Lấy số mili-giây từ chuỗi /Date(1748663189623)/
        const match = /\/Date\((\d+)\)\//.exec(dotNetDate);
        if (!match) return dotNetDate;

        const timestamp = parseInt(match[1], 10);
        const d = new Date(timestamp);

        if (isNaN(d.getTime())) return dotNetDate;

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        // Trả về định dạng dd/MM/yyyy
        return `${day}/${month}/${year}`;
    }

    function exportAllAccounts() {
        fetch('/Admin/Account/ExportAllAccounts')
            .then(r => r.json())
            .then(data => {
                if (!data.success || !data.items?.length) {
                    showToast("Không có dữ liệu để xuất!", "warning");
                    return;
                }

                let html = `
                    <meta charset="UTF-8">
                    <style>
                        table {
                            font-family: 'Times New Roman', Times, serif;
                            font-size: 14px;
                            border-collapse: collapse;
                            text-align: center;
                        }
                        th, td {
                            padding: 6px;
                            text-align: center;
                            vertical-align: middle;
                        }
                    </style>
                    <table border="1">
                        <thead>
                            <tr>
                                <th>STT</th>
                                <th>Tên Tài Khoản</th>
                                <th>Email</th>
                                <th>Loại Tài Khoản</th>
                            </tr>
                        </thead>
                        <tbody>
                    `;



                data.items.forEach((a, i) => {
                    html += `<tr>
                    <td>${i + 1}</td>
                    <td>${a.Username}</td>
                    <td>${a.Email}</td>
                    <td>${a.RoleName}</td>
                </tr>`;
                });

                html += `</tbody></table>`;

                const blob = new Blob([html], {
                    type: "application/vnd.ms-excel;charset=utf-8;"
                });

                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `DanhSachTaiKhoan_${new Date().toISOString().slice(0, 10)}.xls`;
                a.click();
                URL.revokeObjectURL(url);
                showToast("Xuất Excel toàn bộ thành công!", "success");
            })
            .catch(() => showToast("Lỗi tải dữ liệu!", "error"));
    }



});