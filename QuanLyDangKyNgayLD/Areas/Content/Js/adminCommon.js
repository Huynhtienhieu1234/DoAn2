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
    const checkedBoxes = document.querySelectorAll('.check-item-dot:checked, tbody input[type="checkbox"]:checked');
    const uniqueIds = [...new Set(Array.from(checkedBoxes).map(cb => parseInt(cb.value, 10)).filter(id => !isNaN(id) && id > 0))];
    const count = uniqueIds.length;

    // Tìm tất cả các nút xóa đã chọn trên trang
    const bulkDeleteBtns = document.querySelectorAll('.btn-delete-selected, #btnDeleteSelected, #btnDeleteSelectedDot, #btnDeleteSelectedStudent, #btnDeleteSelectedAccount, #btnDeleteSelectedDuyet');
    bulkDeleteBtns.forEach(btn => {
        if (count > 0) {
            btn.style.setProperty('display', 'inline-flex', 'important');
            const countSpan = btn.querySelector('.selected-count');
            if (countSpan) {
                countSpan.textContent = count;
            } else {
                btn.innerHTML = `<i class="fas fa-trash-alt me-1"></i> Xóa đã chọn (${count})`;
            }
        } else {
            btn.style.setProperty('display', 'none', 'important');
        }
    });

    // Cập nhật nhãn chọn tất cả của Catalog nếu có
    const catalogCountEl = document.getElementById("catalogSelectedCount");
    if (catalogCountEl) catalogCountEl.textContent = count;
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
var currentSelectedBulkIds = window.currentSelectedBulkIds || [];
var currentBulkDeleteEndpoint = window.currentBulkDeleteEndpoint || '';
var currentBulkReloadFn = window.currentBulkReloadFn || null;

document.addEventListener('click', function (e) {
    const btn = e.target.closest('.btn-delete-selected, #btnDeleteSelected, #btnDeleteSelectedDot, #btnDeleteSelectedStudent, #btnDeleteSelectedAccount, #btnDeleteSelectedDuyet');
    if (!btn) return;

    // Lấy danh sách ID đã tick chọn (hỗ trợ cả dạng bảng và dạng catalog thẻ)
    const checkedBoxes = document.querySelectorAll('.check-item-dot:checked, tbody input[type="checkbox"]:checked');
    if (checkedBoxes.length === 0) {
        showToast('Vui lòng chọn ít nhất một mục để xóa!', 'warning');
        return;
    }

    currentSelectedBulkIds = [...new Set(Array.from(checkedBoxes).map(cb => parseInt(cb.value)).filter(id => !isNaN(id) && id > 0))];
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

// ================== 5. HỆ THỐNG SKELETON LOADING (DÙNG CHUNG) ==================
window.renderTableSkeleton = function (target, rowCount = 6, colCount = 8, hasCheckbox = true) {
    let tbody = typeof target === 'string' ? document.querySelector(target) : target;
    if (!tbody) return;

    let html = '';
    const textWidths = ['45%', '65%', '80%', '55%', '70%', '60%', '75%'];

    for (let r = 0; r < rowCount; r++) {
        html += '<tr class="skeleton-table-row">';
        for (let c = 0; c < colCount; c++) {
            if (hasCheckbox && c === 0) {
                // Checkbox
                html += '<td class="text-center align-middle py-3"><span class="skeleton-box skeleton-checkbox"></span></td>';
            } else if ((hasCheckbox && c === 1) || (!hasCheckbox && c === 0)) {
                // STT
                html += '<td class="text-center align-middle py-3"><span class="skeleton-box skeleton-text" style="width: 20px;"></span></td>';
            } else if (c === colCount - 1) {
                // Tác vụ (Action buttons)
                html += '<td class="text-center align-middle py-3"><div class="d-flex justify-content-center gap-1"><span class="skeleton-box skeleton-btn" style="width: 28px; height: 28px;"></span><span class="skeleton-box skeleton-btn" style="width: 28px; height: 28px;"></span><span class="skeleton-box skeleton-btn" style="width: 28px; height: 28px;"></span></div></td>';
            } else if (c === colCount - 2) {
                // Trạng thái / Badge
                html += '<td class="text-center align-middle py-3"><span class="skeleton-box skeleton-pill" style="width: 75px; height: 22px;"></span></td>';
            } else {
                // Cột văn bản thông thường
                const w = textWidths[(r + c) % textWidths.length];
                html += `<td class="align-middle py-3"><span class="skeleton-box skeleton-text" style="width: ${w};"></span></td>`;
            }
        }
        html += '</tr>';
    }
    tbody.innerHTML = html;
};

window.renderCatalogSkeleton = function (target, cardCount = 6) {
    let container = typeof target === 'string' ? document.querySelector(target) : target;
    if (!container) return;

    let html = '';
    for (let i = 0; i < cardCount; i++) {
        html += `
        <div class="col-12 col-md-6 col-lg-4 skeleton-catalog-item">
            <div class="card h-100 border rounded-4 p-3 shadow-sm bg-white skeleton-catalog-card">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div class="d-flex align-items-center gap-2">
                        <span class="skeleton-box skeleton-checkbox"></span>
                        <span class="skeleton-box skeleton-text" style="width: 80px; height: 16px;"></span>
                    </div>
                    <span class="skeleton-box skeleton-pill" style="width: 80px; height: 22px;"></span>
                </div>
                <div class="mb-3">
                    <span class="skeleton-box skeleton-text mb-2 d-block" style="width: 85%; height: 18px;"></span>
                    <span class="skeleton-box skeleton-text d-block" style="width: 60%; height: 13px;"></span>
                </div>
                <div class="d-flex align-items-center gap-2 mb-3">
                    <span class="skeleton-box skeleton-pill" style="width: 75px; height: 24px;"></span>
                    <span class="skeleton-box skeleton-pill" style="width: 65px; height: 24px;"></span>
                    <span class="skeleton-box skeleton-pill ms-auto" style="width: 55px; height: 24px;"></span>
                </div>
                <div class="d-flex justify-content-between align-items-center pt-2 border-top mt-auto" style="border-color: #f1f5f9;">
                    <span class="skeleton-box skeleton-text" style="width: 75px; height: 14px;"></span>
                    <div class="d-flex gap-1">
                        <span class="skeleton-box skeleton-btn" style="width: 28px; height: 28px;"></span>
                        <span class="skeleton-box skeleton-btn" style="width: 28px; height: 28px;"></span>
                        <span class="skeleton-box skeleton-btn" style="width: 28px; height: 28px;"></span>
                    </div>
                </div>
            </div>
        </div>`;
    }
    container.innerHTML = html;
};

// ================== 5. Fast Navigation Indicator & Link Prefetch ==================
(function () {
    let progressBar = null;
    let progressTimer = null;

    function getOrCreateProgressBar() {
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.id = 'topPageProgressBar';
            progressBar.style.cssText = 'position:fixed;top:0;left:0;width:0%;height:3px;background:linear-gradient(90deg,#2563eb,#38bdf8);z-index:999999;transition:width 0.2s ease, opacity 0.3s ease;pointer-events:none;box-shadow:0 0 10px rgba(37,99,235,0.7);';
            document.body.appendChild(progressBar);
        }
        return progressBar;
    }

    function startTopProgress() {
        const bar = getOrCreateProgressBar();
        bar.style.opacity = '1';
        bar.style.width = '30%';
        clearInterval(progressTimer);
        let current = 30;
        progressTimer = setInterval(() => {
            if (current < 85) {
                current += Math.random() * 15;
                bar.style.width = current + '%';
            }
        }, 150);
    }

    function finishTopProgress() {
        if (progressBar) {
            clearInterval(progressTimer);
            progressBar.style.width = '100%';
            setTimeout(() => {
                progressBar.style.opacity = '0';
                setTimeout(() => {
                    progressBar.style.width = '0%';
                }, 300);
            }, 100);
        }
    }

    // Khi người dùng click link chuyển trang: hiện ngay thanh tiến trình mà KHÔNG can thiệp preventDefault
    document.addEventListener('click', function (e) {
        const link = e.target.closest('a');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href || href === '#' || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:') || link.target === '_blank' || link.hasAttribute('download')) {
            return;
        }

        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (link.origin && link.origin !== window.location.origin) return;

        // Trình duyệt chuyển trang tự nhiên theo chuẩn MVC, hiển thị thanh tiến trình tức thì
        startTopProgress();

        if (link.closest('#adminSidebar, .sidebar-nav')) {
            document.querySelectorAll('#adminSidebar .nav-link.active, .sidebar-nav .nav-link.active').forEach(el => el.classList.remove('active'));
            link.classList.add('active');
        }
    });

    // Prefetch link trước khi click khi hover chuột (tiết kiệm 200-300ms thời gian chờ mạng)
    const prefetchedUrls = new Set();
    document.addEventListener('mouseover', function (e) {
        const link = e.target.closest('a');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href || href === '#' || href.startsWith('javascript:') || link.target === '_blank') return;
        if (link.origin && link.origin !== window.location.origin) return;

        const fullUrl = link.href;
        if (prefetchedUrls.has(fullUrl)) return;
        prefetchedUrls.add(fullUrl);

        try {
            const prefetchLink = document.createElement('link');
            prefetchLink.rel = 'prefetch';
            prefetchLink.href = fullUrl;
            document.head.appendChild(prefetchLink);
        } catch (err) { }
    });

    if (document.readyState === 'complete') {
        finishTopProgress();
    } else {
        window.addEventListener('load', finishTopProgress);
    }
})();


