document.addEventListener("DOMContentLoaded", function () {
    let currentPage = 1;
    const pageSize = 5;
    let totalPages = 1;

    // Hàm hiển thị toast
    function showToast(message, type = "info") {
        const container = document.getElementById("toastContainer");
        if (!container) {
            alert(message); // fallback nếu chưa có toastContainer
            return;
        }
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    // Tạo loading overlay động
    function createLoadingOverlay() {
        const tableContainer = document.querySelector('.table-responsive');
        if (!tableContainer) return null;
        let overlay = tableContainer.querySelector('.loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.innerHTML = '<div class="loading-spinner"></div>';
            tableContainer.style.position = 'relative';
            tableContainer.appendChild(overlay);
        }
        return overlay;
    }

    function showLoading() {
        const overlay = createLoadingOverlay();
        if (overlay) overlay.classList.add('active');
        const pagination = document.querySelector('.d-flex.justify-content-center.mt-3');
        if (pagination) {
            pagination.style.opacity = '0';
            pagination.style.visibility = 'hidden';
        }
    }

    function hideLoading() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) overlay.classList.remove('active');
        const pagination = document.querySelector('.d-flex.justify-content-center.mt-3');
        if (pagination) {
            setTimeout(() => {
                pagination.style.opacity = '1';
                pagination.style.visibility = 'visible';
                pagination.style.animation = 'paginationFadeIn 0.7s ease-out';
            }, 300);
        }
    }

    // Hàm load danh sách phiếu
    function loadDanhSach(page = 1) {
        const tbody = document.getElementById("duyetTableBody");
        if (!tbody) {
            console.error("Không tìm thấy #duyetTableBody trong DOM.");
            return;
        }
        showLoading();
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Đang tải...</td></tr>`;
        fetch(`/Admin/AdminSuscesWord/GetList?page=${page}&pageSize=${pageSize}`)
            .then(r => r.json())
            .then(res => {
                const data = res.data || [];
                currentPage = res.currentPage;
                totalPages = res.totalPages || 1;
                tbody.innerHTML = "";
                if (data.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Không có dữ liệu</td></tr>`;
                    hideLoading();
                    return;
                }
                data.forEach((item, index) => {
                    const row = document.createElement("tr");
                    row.style.animationDelay = `${index * 0.1}s`;
                    row.style.opacity = '0';
                    row.innerHTML = `
                        <td class="text-center">${(currentPage - 1) * pageSize + index + 1}</td>
                        <td class="text-center">${item.MSSV}</td>
                        <td class="text-start">${item.HoTen}</td>
                        <td class="text-start">${item.Lop}</td>
                        <td class="text-start">${item.Khoa}</td>
                        <td class="text-center">${item.SoNgay ?? 0}</td>
                        <td class="text-center">
                            <button class="btn btn-sm btn-success btn-duyet" data-id="${item.id}">
                                Duyệt
                            </button>
                        </td>`;
                    tbody.appendChild(row);
                    setTimeout(() => {
                        row.style.animation = 'rowSlideDown 0.5s ease-out forwards';
                    }, 10);
                });
                renderPagination();
                hideLoading();
                setTimeout(() => {
                    const buttons = document.querySelectorAll('.btn-duyet');
                    buttons.forEach((btn, index) => {
                        btn.style.animationDelay = `${index * 0.05}s`;
                        btn.style.animation = 'buttonFadeIn 0.6s ease-out forwards';
                    });
                }, 500);
            })
            .catch(err => {
                console.error(err);
                tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Lỗi tải dữ liệu!</td></tr>`;
                hideLoading();
            });
    }

    // Hàm render phân trang
    function renderPagination() {
        const container = document.getElementById("pageNumbers");
        if (!container) return;
        container.innerHTML = "";
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement("button");
            btn.className = `btn btn-sm mx-1 ${i === currentPage ? "btn-primary active" : "btn-outline-primary"}`;
            btn.textContent = i;
            btn.style.animationDelay = `${i * 0.05}s`;
            btn.style.opacity = '0';
            btn.style.animation = 'fadeInScale 0.5s ease-out forwards';
            btn.addEventListener("click", () => {
                currentPage = i;
                loadDanhSach(i);
            });
            container.appendChild(btn);
        }
        const prev = document.getElementById("prev");
        const next = document.getElementById("next");
        if (prev) prev.disabled = currentPage <= 1;
        if (next) next.disabled = currentPage >= totalPages;
        if (prev) {
            prev.style.animation = 'fadeInScale 0.5s ease-out 0.1s forwards';
            prev.style.opacity = '0';
        }
        if (next) {
            next.style.animation = 'fadeInScale 0.5s ease-out 0.15s forwards';
            next.style.opacity = '0';
        }
    }

    document.getElementById("prev")?.addEventListener("click", () => {
        if (currentPage > 1) loadDanhSach(currentPage - 1);
    });
    document.getElementById("next")?.addEventListener("click", () => {
        if (currentPage < totalPages) loadDanhSach(currentPage + 1);
    });

    // ✅ Xử lý nút Duyệt
    document.addEventListener("click", e => {
        const btn = e.target.closest(".btn-duyet");
        if (!btn) return;
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => { btn.style.transform = ''; }, 150);
        const id = btn.dataset.id;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Đang duyệt...';
        btn.disabled = true;
        fetch("/Admin/AdminSuscesWord/DuyetAjax", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-RequestVerificationToken": document.querySelector('input[name="__RequestVerificationToken"]')?.value || ""
            },
            body: JSON.stringify({ id: parseInt(id) })
        })
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    btn.innerHTML = '<i class="fas fa-check me-1"></i> Đã duyệt';
                    btn.className = 'btn btn-sm btn-outline-success';
                    showToast("Đã duyệt và gửi email đi thành công!", "success"); // ✅ thông báo
                    setTimeout(() => { loadDanhSach(currentPage); }, 1000);
                } else {
                    btn.innerHTML = 'Duyệt';
                    btn.disabled = false;
                    showToast("Lỗi: " + res.message, "error");
                }
            })
            .catch(() => {
                btn.innerHTML = 'Duyệt';
                btn.disabled = false;
                showToast("Lỗi kết nối server!", "error");
            });
    });

    setTimeout(() => { loadDanhSach(1); }, 300);
});
