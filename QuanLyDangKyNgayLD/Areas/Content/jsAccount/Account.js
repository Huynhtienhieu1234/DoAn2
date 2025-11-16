document.addEventListener("DOMContentLoaded", function () {
    // ======== BIẾN TOÀN CỤC ========
    let allRows = Array.from(document.querySelectorAll("#accountTableBody tr:not(.no-data-row)"));
    const searchBox = document.getElementById("searchBox");
    const roleFilter = document.getElementById("roleFilter");
    const itemsPerPage = 5;
    let currentPage = 1;
    let currentKeyword = '';
    let currentRole = '';
    let currentDeleteId = null;
    let currentResetId = null;
    let currentEditData = null;
    let searchTimeout = null;

    // ======== KHỞI TẠO ========
    initialize();

    function initialize() {
        setupEventListeners();
        applyFilters();
    }

    function setupEventListeners() {
        // Nút sửa
        document.querySelectorAll(".btn-edit").forEach(btn => {
            btn.addEventListener("click", handleEdit);
        });
        // Nút xóa
        document.querySelectorAll(".btn-delete").forEach(btn => {
            btn.addEventListener("click", handleDelete);
        });
        // Nút reset password
        document.querySelectorAll(".btn-reset").forEach(btn => {
            btn.addEventListener("click", handleResetPassword);
        });
        // Nút chi tiết
        document.querySelectorAll(".btn-detail").forEach(btn => {
            btn.addEventListener("click", handleDetail);
        });
        // Form edit
        document.getElementById('editForm').addEventListener('submit', handleEditSubmit);
        // Xác nhận xóa
        document.getElementById('confirmDeleteBtn').addEventListener('click', handleConfirmDelete);
        // Xác nhận reset password
        document.getElementById('confirmResetBtn').addEventListener('click', handleConfirmReset);
        // Tìm kiếm
        searchBox.addEventListener("input", handleSearch);
        // Lọc theo vai trò
        roleFilter.addEventListener("change", handleRoleFilter);
        // Phân trang
        document.getElementById("prev").addEventListener("click", goToPrevPage);
        document.getElementById("next").addEventListener("click", goToNextPage);
        // Xuất Excel
        document.getElementById("btnExportExcel").addEventListener("click", handleExportExcel);
        // Thêm tài khoản
        document.getElementById("btnAdd").addEventListener("click", handleAddAccount);
        // Xem tài khoản đã xóa
        document.getElementById("btnViewDeleted").addEventListener("click", handleViewDeleted);
        // Làm mới danh sách đã xóa
        document.getElementById("btnRefreshDeleted").addEventListener("click", loadDeletedAccounts);
        // Reset modal khi đóng
        setupModalEvents();
    }

    function setupModalEvents() {
        document.getElementById('editModal').addEventListener('hidden.bs.modal', function () {
            currentEditData = null;
            document.querySelectorAll('.is-changed').forEach(el => {
                el.classList.remove('is-changed');
            });
        });
        document.getElementById('deleteModal').addEventListener('hidden.bs.modal', function () {
            currentDeleteId = null;
            resetDeleteButton();
        });
        document.getElementById('resetPasswordModal').addEventListener('hidden.bs.modal', function () {
            currentResetId = null;
            resetResetButton();
        });
        document.getElementById('deletedAccountsModal').addEventListener('shown.bs.modal', function () {
            loadDeletedAccounts();
        });
    }

    // ======== XỬ LÝ SỰ KIỆN CHÍNH ========
    function handleEdit() {
        const id = this.dataset.id;
        const username = this.dataset.username;
        const email = this.dataset.email;
        const roleId = this.dataset.roleid;
        const roleName = this.dataset.rolename;

        currentEditData = { id, username, email, roleId, roleName };

        document.getElementById("editId").value = id;
        document.getElementById("editUsername").value = username;
        document.getElementById("editEmail").value = email;
        document.getElementById("editRole").value = roleId;

        document.getElementById("editModalLabel").innerHTML = '<i class="fa fa-edit me-2"></i>Chỉnh sửa tài khoản';

        showModal("editModal");
    }

    function handleDelete() {
        const row = this.closest("tr");
        const id = this.dataset.id;
        const username = row.cells[1]?.innerText || "";
        const email = row.cells[3]?.innerText || "";
        const role = row.cells[4]?.innerText || "";
        showDeleteModal(id, username, email, role);
    }

    function handleResetPassword() {
        const row = this.closest("tr");
        const id = this.dataset.id;
        const username = row.cells[1]?.innerText || "";
        const email = row.cells[3]?.innerText || "";
        const role = row.cells[4]?.innerText || "";
        showResetPasswordModal(id, username, email, role);
    }

    function handleDetail() {
        const row = this.closest("tr");
        const id = this.dataset.id;
        const username = row.cells[1]?.innerText || "";
        const email = row.cells[3]?.innerText || "";
        const role = row.cells[4]?.innerText || "";
        document.getElementById("detailId").textContent = id;
        document.getElementById("detailUsername").textContent = username;
        document.getElementById("detailEmail").textContent = email;
        document.getElementById("detailRole").textContent = role;
        showModal("detailModal");
    }

    // ======== XỬ LÝ TÀI KHOẢN ĐÃ XÓA ========
    function handleViewDeleted() {
        showModal("deletedAccountsModal");
    }

    function loadDeletedAccounts() {
        const tbody = document.getElementById("deletedAccountsTableBody");
        const refreshBtn = document.getElementById("btnRefreshDeleted");

        showLoading(refreshBtn, 'Đang tải...');

        console.log('Fetching deleted accounts...');

        fetch('/Admin/Account/GetDeletedAccounts')
            .then(response => {
                console.log('Response status:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('Raw API response:', data);
                if (data.success && data.accounts) {
                    console.log('Accounts data:', data.accounts);
                    renderDeletedAccounts(data.accounts);
                } else {
                    console.log('No accounts or API error:', data);
                    tbody.innerHTML = '<tr class="no-data-row"><td colspan="7">Không có dữ liệu</td></tr>';
                }
            })
            .catch(error => {
                console.error('Error loading deleted accounts:', error);
                tbody.innerHTML = '<tr class="no-data-row"><td colspan="7">Lỗi tải dữ liệu</td></tr>';
            })
            .finally(() => {
                resetButton(refreshBtn, 'Làm mới', '<i class="fas fa-sync-alt me-1"></i>');
            });
    }

    function renderDeletedAccounts(accounts) {
        const tbody = document.getElementById("deletedAccountsTableBody");

        if (!accounts || accounts.length === 0) {
            tbody.innerHTML = '<tr class="no-data-row"><td colspan="6" class="text-center text-muted py-3">Không có tài khoản đã xóa</td></tr>';
            return;
        }

        let html = '';
        accounts.forEach((account, index) => {
            // Rút gọn email nếu quá dài
            const shortEmail = account.email && account.email.length > 20
                ? account.email.substring(0, 20) + '...'
                : account.email;

            // Rút gọn tên tài khoản nếu quá dài
            const shortUsername = account.username && account.username.length > 15
                ? account.username.substring(0, 15) + '...'
                : account.username;

            // Format ngày tháng đơn giản
            const displayDate = formatDateShort(account.deletedAt);

            html += `
            <tr>
                <td class="text-center">${index + 1}</td>
                <td>
                    <div class="fw-bold" title="${account.username}">${shortUsername}</div>
                </td>
                <td title="${account.email}">${shortEmail}</td>
                <td class="text-center">
                    <span class="badge bg-secondary">${account.roleName || 'N/A'}</span>
                </td>
                <td class="text-center">${displayDate}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-success btn-restore" 
                            data-id="${account.id}"
                            title="Khôi phục tài khoản">
                        <i class="fas fa-trash-restore me-1"></i> Khôi phục
                    </button>
                </td>
            </tr>
        `;
        });

        tbody.innerHTML = html;

        // Thêm event listeners cho các nút khôi phục
        document.querySelectorAll('.btn-restore').forEach(btn => {
            btn.addEventListener('click', handleRestoreAccount);
        });
    }

    function formatDateShort(dateString) {
        if (!dateString || dateString === '0001-01-01T00:00:00' || dateString === '') {
            return 'N/A';
        }

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return 'N/A';
            }

            // Format ngắn gọn: dd/mm/yyyy
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();

            return `${day}/${month}/${year}`;

        } catch (error) {
            return 'N/A';
        }
    }

    function handleRestoreAccount() {
        const accountId = this.dataset.id;
        const row = this.closest('tr');
        const accountName = row.cells[1].textContent.trim();

        if (confirm(`Bạn có chắc chắn muốn khôi phục tài khoản "${accountName}"?`)) {
            const btn = this;
            showLoading(btn, 'Đang khôi phục...');

            fetch('/Admin/Account/RestoreAccount', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: accountId })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showToast(data.message, 'success');
                        // Xóa hàng khỏi bảng sau khi khôi phục thành công
                        row.remove();

                        // Nếu không còn hàng nào, hiển thị thông báo
                        const remainingRows = document.querySelectorAll('#deletedAccountsTableBody tr:not(.no-data-row)');
                        if (remainingRows.length === 0) {
                            document.getElementById('deletedAccountsTableBody').innerHTML =
                                '<tr class="no-data-row"><td colspan="6" class="text-center text-muted py-3">Không có tài khoản đã xóa</td></tr>';
                        }
                    } else {
                        showToast(data.message || 'Có lỗi xảy ra', 'error');
                        resetButton(btn, 'Khôi phục', '<i class="fas fa-trash-restore me-1"></i>');
                    }
                })
                .catch(error => {
                    console.error('Restore error:', error);
                    showToast('Lỗi kết nối! Vui lòng thử lại.', 'error');
                    resetButton(btn, 'Khôi phục', '<i class="fas fa-trash-restore me-1"></i>');
                });
        }
    }

    function handleDetailDeleted() {
        const accountId = this.dataset.id;

        // Tìm account trong danh sách hiện tại (cần lưu trữ dữ liệu tạm thời)
        fetch(`/Admin/Account/GetAccountDetail/${accountId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.account) {
                    const acc = data.account;
                    document.getElementById("detailId").textContent = acc.id;
                    document.getElementById("detailUsername").textContent = acc.username;
                    document.getElementById("detailEmail").textContent = acc.email;
                    document.getElementById("detailRole").textContent = acc.roleName;
                    showModal("detailModal");
                } else {
                    showToast('Không thể tải thông tin chi tiết', 'error');
                }
            })
            .catch(error => {
                showToast('Lỗi kết nối! Vui lòng thử lại.', 'error');
            });
    }

    function formatDate(dateString) {
        console.log('Formatting date:', dateString);

        if (!dateString || dateString === '0001-01-01T00:00:00' || dateString === '') {
            return 'Chưa xác định';
        }

        try {
            // Thử parse date
            const date = new Date(dateString);

            if (isNaN(date.getTime())) {
                return 'Ngày không hợp lệ';
            }

            // Format đơn giản
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');

            return `${day}/${month}/${year} ${hours}:${minutes}`;

        } catch (error) {
            console.error('Date error:', error);
            return dateString; // Trả về nguyên bản nếu lỗi
        }
    }





    // ======== CÁC HÀM CÒN LẠI GIỮ NGUYÊN ========
    function handleEditSubmit(e) {
        e.preventDefault();
        if (!hasChanges()) {
            showToast('Không có thay đổi nào để lưu!', 'info');
            return;
        }
        const formData = new FormData(this);
        const submitButton = this.querySelector('button[type="submit"]');
        showLoading(submitButton, 'Đang lưu...');

        fetch(this.action, {
            method: 'POST',
            body: formData
        })
            .then(response => {
                if (response.redirected) {
                    window.location.href = response.url;
                } else {
                    return response.json();
                }
            })
            .then(data => {
                if (data && data.success) {
                    hideModal("editModal");
                    showToast(data.message, 'success');
                    setTimeout(() => location.reload(), 1500);
                } else if (data) {
                    showToast(data.message, 'error');
                }
            })
            .catch(error => {
                showToast('Lỗi kết nối! Vui lòng thử lại.', 'error');
            })
            .finally(() => {
                resetButton(submitButton, 'Lưu thay đổi', '<i class="fa fa-save me-1"></i>');
            });
    }

    function handleConfirmDelete() {
        if (!currentDeleteId) return;
        const btn = this;
        showLoading(btn, 'Đang xóa...');
        deleteAccount(currentDeleteId);
    }

    function handleConfirmReset() {
        if (!currentResetId) return;
        const btn = this;
        showLoading(btn, 'Đang xử lý...');
        resetPassword(currentResetId);
    }

    function handleSearch() {
        clearTimeout(searchTimeout);
        currentKeyword = this.value.trim();
        searchTimeout = setTimeout(() => {
            applyFilters();
        }, 300);
    }

    function handleRoleFilter() {
        currentRole = this.value;
        applyFilters();
    }

    function handleExportExcel() {
        const visibleRows = getVisibleRows();
        if (visibleRows.length === 0) {
            showToast("Không có dữ liệu để xuất!", "warning");
            return;
        }
        exportToExcel(visibleRows);
    }

    function handleAddAccount() {
        document.getElementById("editForm").reset();
        document.getElementById("editId").value = "";
        document.getElementById("editModalLabel").innerHTML = '<i class="fa fa-plus me-2"></i>Thêm tài khoản mới';
        showModal("editModal");
    }

    // ======== HÀM LỌC VÀ TÌM KIẾM ========
    const roleDbMap = {
        'Sinh viên': 'SinhVien',
        'Lớp phó lao động': 'LopPhoLaoDong',
        'Quản lý': 'QuanLy',
        'Admin': 'Admin'
    };

    function applyFilters() {
        const keyword = currentKeyword.toLowerCase().trim();
        const selectedRole = currentRole;
        let visibleCount = 0;

        allRows.forEach(row => {
            const username = (row.cells[1]?.innerText || "").toLowerCase();
            const email = (row.cells[3]?.innerText || "").toLowerCase();
            const dbRole = row.cells[4]?.innerText || "";

            let searchMatch = true;
            if (keyword !== '') {
                searchMatch = username.includes(keyword) ||
                    email.includes(keyword) ||
                    dbRole.toLowerCase().includes(keyword);
            }

            let roleMatch = true;
            if (selectedRole !== '' && selectedRole !== 'Tất Cả') {
                const dbRoleToMatch = roleDbMap[selectedRole];
                roleMatch = dbRole === dbRoleToMatch;
            }

            const shouldShow = searchMatch && roleMatch;
            row.style.display = shouldShow ? "" : "none";
            if (shouldShow) visibleCount++;
        });

        handleNoDataMessage(visibleCount);
        currentPage = 1;
        updateSTT();
        renderTable();
    }

    function handleNoDataMessage(visibleCount) {
        let noDataRow = document.querySelector('.no-data-row');
        if (visibleCount === 0) {
            if (!noDataRow) {
                noDataRow = document.createElement('tr');
                noDataRow.className = 'no-data-row';
                noDataRow.innerHTML = '<td colspan="6" class="text-center text-muted py-3">Không có dữ liệu phù hợp</td>';
                document.getElementById('accountTableBody').appendChild(noDataRow);
            }
            noDataRow.style.display = '';
        } else if (noDataRow) {
            noDataRow.style.display = 'none';
        }
    }

    function getVisibleRows() {
        return allRows.filter(row => row.style.display !== "none");
    }

    // ======== PHÂN TRANG ========
    function renderTable() {
        const visibleRows = getVisibleRows();
        const totalItems = visibleRows.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

        if (currentPage > totalPages && totalPages > 0) {
            currentPage = totalPages;
        }

        visibleRows.forEach((row, index) => {
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = currentPage * itemsPerPage;
            row.style.display = (index >= startIndex && index < endIndex) ? "" : "none";
        });

        updatePaginationInfo(totalPages, totalItems);
    }

    function updatePaginationInfo(totalPages, totalItems) {
        const pageInfo = document.getElementById("pageInfo");
        const prevBtn = document.getElementById("prev");
        const nextBtn = document.getElementById("next");

        if (pageInfo) {
            pageInfo.textContent = `Trang ${currentPage} / ${totalPages} (${totalItems} mục)`;
        }
        if (prevBtn) {
            prevBtn.disabled = currentPage === 1;
        }
        if (nextBtn) {
            nextBtn.disabled = currentPage === totalPages || totalPages === 0;
        }
    }

    function goToPrevPage() {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    }

    function goToNextPage() {
        const visibleRows = getVisibleRows();
        const totalPages = Math.ceil(visibleRows.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    }

    // ======== HÀM TIỆN ÍCH ========
    function updateSTT() {
        const visibleRows = getVisibleRows();
        visibleRows.forEach((row, index) => {
            const sttCell = row.querySelector('td:first-child');
            if (sttCell) {
                sttCell.textContent = index + 1;
            }
        });
    }

    function showDeleteModal(id, username, email, role) {
        currentDeleteId = id;
        document.getElementById('deleteConfirmText').textContent = `Bạn có chắc chắn muốn xóa tài khoản "${username}"?`;
        document.getElementById('deleteAccountInfo').innerHTML = `<strong>${username}</strong><br>${email}<br><span class="badge bg-secondary">${role}</span>`;
        showModal('deleteModal');
    }

    function showResetPasswordModal(id, username, email, role) {
        currentResetId = id;
        document.getElementById('resetCurrentUsername').textContent = username;
        document.getElementById('resetCurrentEmail').textContent = email;
        document.getElementById('resetCurrentRole').textContent = role;
        showModal('resetPasswordModal');
    }

    function showModal(modalId) {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        }
    }

    function hideModal(modalId) {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
        }
    }

    function showLoading(button, text) {
        const originalHTML = button.innerHTML;
        button.innerHTML = `<i class="fa fa-spinner fa-spin me-1"></i> ${text}`;
        button.disabled = true;
        button.dataset.originalHTML = originalHTML;
    }

    function resetButton(button, originalText, icon = '') {
        if (button.dataset.originalHTML) {
            button.innerHTML = button.dataset.originalHTML;
        } else {
            button.innerHTML = icon + originalText;
        }
        button.disabled = false;
        delete button.dataset.originalHTML;
    }

    function hasChanges() {
        if (!currentEditData) return true;
        const currentUsername = document.getElementById('editUsername').value;
        const currentEmail = document.getElementById('editEmail').value;
        const currentRole = document.getElementById('editRole').value;
        const currentPassword = document.getElementById('editPassword').value;
        return currentUsername !== currentEditData.username ||
            currentEmail !== currentEditData.email ||
            currentRole !== currentEditData.roleId ||
            currentPassword !== '';
    }

    function deleteAccount(id) {
        const formData = new FormData();
        formData.append('id', id);

        fetch('/Admin/Account/DeleteAjax', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                hideModal('deleteModal');
                if (data.success) {
                    showToast(data.message, 'success');
                    setTimeout(() => location.reload(), 1500);
                } else {
                    showToast(data.message, 'error');
                    resetDeleteButton();
                }
            })
            .catch(error => {
                showToast('Lỗi kết nối! Vui lòng thử lại.', 'error');
                resetDeleteButton();
            });
    }

    function resetPassword(id) {
        const formData = new FormData();
        formData.append('id', id);

        fetch('/Admin/Account/ResetPasswordAjax', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                hideModal('resetPasswordModal');
                if (data.success) {
                    showToast(data.message, 'success');
                } else {
                    showToast(data.message, 'error');
                }
                resetResetButton();
            })
            .catch(error => {
                showToast('Lỗi kết nối! Vui lòng thử lại.', 'error');
                resetResetButton();
            });
    }

    function resetDeleteButton() {
        const btn = document.getElementById('confirmDeleteBtn');
        if (btn) resetButton(btn, 'Xác nhận xóa', '<i class="fas fa-trash me-1"></i>');
    }

    function resetResetButton() {
        const btn = document.getElementById('confirmResetBtn');
        if (btn) resetButton(btn, 'Đặt lại mật khẩu', '<i class="fas fa-redo me-1"></i>');
    }

    function showToast(message, type) {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            console.log(`${type}: ${message}`);
            alert(message);
        }
    }

    function exportToExcel(visibleRows) {
        let html = `
            <table border="1">
                <thead>
                    <tr>
                        <th>STT</th>
                        <th>Tên Tài Khoản</th>
                        <th>Mật khẩu</th>
                        <th>Email</th>
                        <th>Loại Tài Khoản</th>
                    </tr>
                </thead>
                <tbody>
        `;
        visibleRows.forEach((row, index) => {
            const cells = row.cells;
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${cells[1]?.innerText || ""}</td>
                    <td>********</td>
                    <td>${cells[3]?.innerText || ""}</td>
                    <td>${cells[4]?.innerText || ""}</td>
                </tr>
            `;
        });
        html += '</tbody></table>';
        const blob = new Blob([html], { type: "application/vnd.ms-excel" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "DanhSachTaiKhoan_" + new Date().toISOString().split('T')[0] + ".xls";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Xuất Excel thành công!", "success");
    }
});