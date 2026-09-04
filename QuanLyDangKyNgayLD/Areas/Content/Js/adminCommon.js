// ================== 1. Toast Thông Báo Dùng Chung ==================
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        console.warn("⚠️ Không tìm thấy #toastContainer trong DOM.");
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: 'fa-check-circle',
        warning: 'fa-exclamation-triangle',
        error: 'fa-times-circle',
        info: 'fa-info-circle'
    };

    const icon = icons[type] || icons.success;

    toast.innerHTML = `
        <div class="toast-body">
            <div class="toast-icon"><i class="fas ${icon}"></i></div>
            <div class="toast-content">${message}</div>
            <button type="button" class="toast-close" onclick="removeToast(this)">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="toast-progress"></div>
    `;

    toastContainer.appendChild(toast);

    // Hiệu ứng xuất hiện
    setTimeout(() => {
        toast.classList.add('show');
        const progress = toast.querySelector('.toast-progress');
        setTimeout(() => progress.classList.add('running'), 100);
    }, 10);

    // Tự động ẩn sau 3.5s
    setTimeout(() => removeToastElement(toast), 3500);
}

function removeToast(button) {
    const toast = button.closest('.toast');
    removeToastElement(toast);
}

function removeToastElement(toast) {
    if (!toast || toast.classList.contains('hiding')) return;
    toast.classList.remove('show');
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 500);
}

// ================== 2. Phân Trang Dùng Chung ==================
function setupPagination(tableBodyId, perPage, pageInfoId, prevBtnId, nextBtnId) {
    const rows = document.querySelectorAll(`#${tableBodyId} tr`);
    const pageInfo = document.getElementById(pageInfoId);
    const prevBtn = document.getElementById(prevBtnId);
    const nextBtn = document.getElementById(nextBtnId);

    if (rows.length === 0) return;

    let currentPage = 1;
    const totalPages = Math.ceil(rows.length / perPage);

    function renderPage() {
        rows.forEach((row, i) => {
            row.style.display = (i >= (currentPage - 1) * perPage && i < currentPage * perPage) ? '' : 'none';
        });
        if (pageInfo) pageInfo.textContent = `Trang ${currentPage}/${totalPages}`;
        if (prevBtn) prevBtn.disabled = currentPage === 1;
        if (nextBtn) nextBtn.disabled = currentPage === totalPages;
    }

    if (prevBtn) prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderPage();
        }
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderPage();
        }
    });

    renderPage();
}

// ================== 3. Tự Động Xử Lý Checkbox & Nút Xóa Đã Chọn ==================
function updateBulkDeleteButtonState(table) {
    if (!table) table = document.querySelector('table');
    if (!table) return;

    const checkedBoxes = table.querySelectorAll('tbody input[type="checkbox"]:checked');
    const count = checkedBoxes.length;

    // Tìm tất cả các nút xóa đã chọn trên trang
    const bulkDeleteBtns = document.querySelectorAll('.btn-delete-selected, #btnDeleteSelected, #btnDeleteSelectedDot, #btnDeleteSelectedStudent, #btnDeleteSelectedAccount, #btnDeleteSelectedDuyet');
    bulkDeleteBtns.forEach(btn => {
        if (count > 0) {
            btn.style.display = 'inline-block';
            const countSpan = btn.querySelector('.selected-count');
            if (countSpan) {
                countSpan.textContent = count;
            } else {
                btn.innerHTML = `<i class="fas fa-trash-alt me-1"></i> Xóa đã chọn (${count})`;
            }
        } else {
            btn.style.display = 'none';
        }
    });
}

document.addEventListener('change', function (e) {
    if (e.target && e.target.id && e.target.id.startsWith('checkAll')) {
        const table = e.target.closest('table');
        if (!table) return;
        const checkboxes = table.querySelectorAll('tbody input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
        updateBulkDeleteButtonState(table);
    } else if (e.target && e.target.type === 'checkbox' && e.target.closest('tbody')) {
        const table = e.target.closest('table');
        if (!table) return;
        const checkAll = table.querySelector('thead input[type="checkbox"]');
        const checkboxes = table.querySelectorAll('tbody input[type="checkbox"]');
        if (checkboxes.length > 0 && checkAll) {
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            const anyChecked = Array.from(checkboxes).some(cb => cb.checked);
            checkAll.checked = allChecked;
            checkAll.indeterminate = !allChecked && anyChecked;
        }
        updateBulkDeleteButtonState(table);
    }
});

// ================== 4. Xử Lý Khi Bấm Nút Xóa Hàng Loạt ==================
let currentSelectedBulkIds = [];
let currentBulkDeleteEndpoint = '';
let currentBulkReloadFn = null;

document.addEventListener('click', function (e) {
    const btn = e.target.closest('.btn-delete-selected, #btnDeleteSelected, #btnDeleteSelectedDot, #btnDeleteSelectedStudent, #btnDeleteSelectedAccount, #btnDeleteSelectedDuyet');
    if (!btn) return;

    // Lấy danh sách ID đã tick chọn
    const table = document.querySelector('table');
    if (!table) return;

    const checkedBoxes = table.querySelectorAll('tbody input[type="checkbox"]:checked');
    if (checkedBoxes.length === 0) {
        showToast('Vui lòng chọn ít nhất một mục để xóa!', 'warning');
        return;
    }

    currentSelectedBulkIds = Array.from(checkedBoxes).map(cb => parseInt(cb.value)).filter(id => !isNaN(id) && id > 0);
    const count = currentSelectedBulkIds.length;

    // Xác định endpoint API theo trang hiện tại
    const path = window.location.pathname.toLowerCase();
    if (path.includes('adminwordregister') || btn.id === 'btnDeleteSelectedDot') {
        currentBulkDeleteEndpoint = '/Admin/AdminWordRegister/DeleteMultipleAjax';
        currentBulkReloadFn = () => {
            if (typeof window.loadDataToTable === 'function') window.loadDataToTable(1);
            else if (typeof loadDataToTable === 'function') loadDataToTable(1);
        };
    } else if (path.includes('adminstudent') || btn.id === 'btnDeleteSelectedStudent') {
        currentBulkDeleteEndpoint = '/Admin/AdminStudent/DeleteMultipleAjax';
        currentBulkReloadFn = () => {
            if (typeof window.loadStudents === 'function') window.loadStudents(1);
            else if (typeof loadStudents === 'function') loadStudents(1);
        };
    } else if (path.includes('account') || btn.id === 'btnDeleteSelectedAccount') {
        currentBulkDeleteEndpoint = '/Admin/Account/DeleteMultipleAjax';
        currentBulkReloadFn = () => {
            if (typeof window.loadFilteredAccounts === 'function') window.loadFilteredAccounts(1);
            else if (typeof window.loadAccounts === 'function') window.loadAccounts(1);
            else if (typeof loadFilteredAccounts === 'function') loadFilteredAccounts(1);
            else if (typeof loadAccounts === 'function') loadAccounts(1);
        };
    } else if (path.includes('adminsuscesword') || btn.id === 'btnDeleteSelectedDuyet') {
        currentBulkDeleteEndpoint = '/Admin/AdminSuscesWord/DeleteMultipleAjax';
        currentBulkReloadFn = () => {
            if (typeof window.loadDanhSach === 'function') window.loadDanhSach(1);
            else if (typeof loadDanhSach === 'function') loadDanhSach(1);
        };
    } else {
        currentBulkDeleteEndpoint = window.location.pathname.replace(/\/+$/, '') + '/DeleteMultipleAjax';
    }

    // Cập nhật text trong modal
    const countText = document.getElementById('bulkDeleteCountText');
    const countConfirm = document.getElementById('bulkDeleteCountConfirm');
    if (countText) countText.textContent = count;
    if (countConfirm) countConfirm.textContent = count;

    // Mở modal xác nhận
    const modalEl = document.getElementById('bulkDeleteConfirmModal');
    if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    } else {
        if (confirm(`Bạn có chắc chắn muốn xóa ${count} mục đã chọn không?`)) {
            executeBulkDelete();
        }
    }
});

function executeBulkDelete() {
    if (!currentSelectedBulkIds || currentSelectedBulkIds.length === 0 || !currentBulkDeleteEndpoint) return;

    const confirmBtn = document.getElementById('btnConfirmBulkDeleteAction');
    const originalText = confirmBtn ? confirmBtn.innerHTML : '';
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Đang xóa...';
    }

    fetch(currentBulkDeleteEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: currentSelectedBulkIds })
    })
    .then(r => r.json())
    .then(res => {
        if (res.success) {
            showToast(res.message || 'Đã xóa các mục đã chọn thành công!', 'success');
            
            // Đóng modal
            const modalEl = document.getElementById('bulkDeleteConfirmModal');
            if (modalEl) {
                const modalInstance = bootstrap.Modal.getInstance(modalEl);
                if (modalInstance) modalInstance.hide();
            }

            // Bỏ tick ô checkAll và ẩn nút xóa
            const checkAlls = document.querySelectorAll('thead input[type="checkbox"]');
            checkAlls.forEach(cb => { cb.checked = false; cb.indeterminate = false; });
            
            const bulkDeleteBtns = document.querySelectorAll('.btn-delete-selected, #btnDeleteSelected, #btnDeleteSelectedDot, #btnDeleteSelectedStudent, #btnDeleteSelectedAccount, #btnDeleteSelectedDuyet');
            bulkDeleteBtns.forEach(btn => btn.style.display = 'none');

            // Tải lại dữ liệu bảng
            if (typeof currentBulkReloadFn === 'function') {
                currentBulkReloadFn();
            }
        } else {
            showToast(res.message || 'Có lỗi xảy ra khi xóa!', 'error');
        }
    })
    .catch(err => {
        console.error(err);
        showToast('Lỗi kết nối tới máy chủ!', 'error');
    })
    .finally(() => {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = originalText;
        }
    });
}

// Lắng nghe nút xác nhận xóa trong modal
document.addEventListener('DOMContentLoaded', function () {
    const confirmActionBtn = document.getElementById('btnConfirmBulkDeleteAction');
    if (confirmActionBtn) {
        confirmActionBtn.addEventListener('click', executeBulkDelete);
    }
});
