document.addEventListener("DOMContentLoaded", function () {

    /* ================== STATE ================== */
    let currentPage = 1;
    const pageSizeSelector = document.getElementById("pageSizeDuyet") || document.getElementById("pageSizeSelector");
    let pageSize = pageSizeSelector ? (parseInt(pageSizeSelector.value, 10) || 10) : 10;
    let totalPages = 1;

    let searchKeyword = "";
    let khoa = "";

    if (pageSizeSelector) {
        pageSizeSelector.addEventListener("change", function () {
            pageSize = parseInt(this.value, 10) || 10;
            currentPage = 1;
            loadDanhSach(1);
        });
    }

    /* ================== LOADING OVERLAY ================== */
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
        overlay?.classList.add('active');

        const pagination = document.querySelector('.d-flex.justify-content-center.mt-3');
        if (pagination) {
            pagination.style.opacity = '0';
            pagination.style.visibility = 'hidden';
        }
    }

    function hideLoading() {
        const overlay = document.querySelector('.loading-overlay');
        overlay?.classList.remove('active');

        const pagination = document.querySelector('.d-flex.justify-content-center.mt-3');
        if (pagination) {
            setTimeout(() => {
                pagination.style.opacity = '1';
                pagination.style.visibility = 'visible';
                pagination.style.animation = 'paginationFadeIn 0.7s ease-out';
            }, 300);
        }
    }

    /* ================== LOAD DATA ================== */
    function loadDanhSach(page = 1) {
        const tbody = document.getElementById("duyetTableBody");
        if (!tbody) return;

        showLoading();
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">Đang tải...</td>
            </tr>`;

        fetch(`/Admin/AdminSuscesWord/GetList?page=${page}&pageSize=${pageSize}&keyword=${encodeURIComponent(searchKeyword)}&khoa=${encodeURIComponent(khoa)}`)
            .then(r => r.json())
            .then(res => {
                const data = res.data || [];
                currentPage = res.currentPage || 1;
                totalPages = res.totalPages || 1;

                tbody.innerHTML = "";

                /* ===== KHÔNG CÓ DỮ LIỆU ===== */
                if (data.length === 0) {
                    const hasFilter = searchKeyword || khoa;
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="8" class="text-center text-muted py-4">
                                ${hasFilter
                            ? "Không tìm thấy dữ liệu phù hợp với điều kiện tìm kiếm / lọc"
                            : "Không có dữ liệu"}
                            </td>
                        </tr>`;
                    hideLoading();
                    return;
                }

                /* ===== RENDER ROW ===== */
                data.forEach((item, index) => {
                    let mssvText = (item.MSSV || "").toString().trim();
                    if (mssvText.length === 9) mssvText = "0" + mssvText;

                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td class="text-center"><input type="checkbox" class="form-check-input check-item-duyet" value="${item.id}"></td>
                        <td class="stt-cell">${(currentPage - 1) * pageSize + index + 1}</td>
                        <td class="text-center fw-semibold text-primary">${mssvText || ""}</td>
                        <td class="text-start fw-semibold">${item.HoTen || ""}</td>
                        <td class="text-start">${item.Lop || ""}</td>
                        <td class="text-start">${item.Khoa || ""}</td>
                        <td class="text-center"><span class="badge bg-success-subtle text-success fw-bold px-2 py-1">${item.SoNgay ?? 0} ngày</span></td>
                        <td class="action-cell text-center">
                            <button class="btn btn-sm btn-success btn-duyet" data-id="${item.id}" title="Duyệt hoàn thành">
                                <i class="fas fa-check"></i>
                            </button>
                        </td>`;
                    tbody.appendChild(tr);
                });

                renderPagination();
                hideLoading();
            })
            .catch(err => {
                console.error(err);
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center text-danger py-4">
                            Lỗi tải dữ liệu. Vui lòng thử lại!
                        </td>
                    </tr>`;
                hideLoading();
            });
    }

    /* ================== PAGINATION ================== */
    function renderPagination() {
        const container = document.getElementById("pageNumbers");
        if (!container) return;

        container.innerHTML = "";

        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement("button");
            btn.className = `btn btn-sm mx-1 ${i === currentPage ? "btn-primary active" : "btn-outline-primary"}`;
            btn.textContent = i;

            btn.addEventListener("click", () => {
                if (i !== currentPage) {
                    currentPage = i;
                    loadDanhSach(i);
                }
            });

            container.appendChild(btn);
        }

        document.getElementById("prev")?.toggleAttribute("disabled", currentPage <= 1);
        document.getElementById("next")?.toggleAttribute("disabled", currentPage >= totalPages);
    }

    document.getElementById("prev")?.addEventListener("click", () => {
        if (currentPage > 1) loadDanhSach(currentPage - 1);
    });

    document.getElementById("next")?.addEventListener("click", () => {
        if (currentPage < totalPages) loadDanhSach(currentPage + 1);
    });

    /* ================== SEARCH & FILTER ================== */
    let searchTimer;
    document.getElementById("searchBox")?.addEventListener("input", function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            searchKeyword = this.value.trim();
            currentPage = 1;
            loadDanhSach(1);
        }, 300);
    });

    document.getElementById("khoaFilter")?.addEventListener("change", function () {
        khoa = this.value;
        currentPage = 1;
        loadDanhSach(1);
    });

    /* ================== DUYỆT ================== */
    document.addEventListener("click", e => {
        const btn = e.target.closest(".btn-duyet");
        if (!btn) return;

        const id = btn.dataset.id;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Đang duyệt...';

        fetch("/Admin/AdminSuscesWord/DuyetAjax", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-RequestVerificationToken":
                    document.querySelector('input[name="__RequestVerificationToken"]')?.value || ""
            },
            body: JSON.stringify({ id: Number(id) })
        })
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    btn.className = "btn btn-sm btn-outline-success";
                    btn.innerHTML = '<i class="fas fa-check me-1"></i> Đã duyệt';
                    window.showToast(res.message || "Duyệt thành công!", "success");
                    setTimeout(() => loadDanhSach(currentPage), 1000);
                } else {
                    btn.disabled = false;
                    btn.innerHTML = "Duyệt";
                    window.showToast(res.message || "Duyệt thất bại!", "error");
                }
            })
            .catch(() => {
                btn.disabled = false;
                btn.innerHTML = "Duyệt";
                window.showToast("Lỗi kết nối server!", "error");
            });
    });

    /* ================== INIT ================== */
    window.loadDanhSach = loadDanhSach;
    setTimeout(() => loadDanhSach(1), 300);
});
