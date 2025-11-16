

// ================== Toast Thông Báo ==================
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

    // Tự động ẩn sau 3s
    setTimeout(() => removeToastElement(toast), 3000);
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

// ================== 2️ Phân Trang ==================
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




