document.addEventListener("DOMContentLoaded", function () {

    /* ================== STATE ================== */
    let currentPage = 1;
    const pageSizeSelector = document.getElementById("pageSizeDuyet") || document.getElementById("pageSizeSelector");
    let pageSize = pageSizeSelector ? (parseInt(pageSizeSelector.value, 10) || 10) : 10;
    let totalPages = 1;

    let searchKeyword = "";
    let khoa = "";
    let currentStatus = "pending";

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
    function setTableEmpty(tbody, isEmpty) {
        const table = tbody && tbody.closest("table");
        if (table) table.classList.toggle("is-empty", !!isEmpty);
        const wrapper = tbody && tbody.closest(".table-responsive, .table-wrapper");
        if (wrapper) wrapper.classList.toggle("is-empty", !!isEmpty);
    }

    function updateTabCounts(counts) {
        if (!counts) return;
        const pendingEl = document.getElementById("pendingCount");
        const completedEl = document.getElementById("completedCount");
        if (pendingEl) pendingEl.textContent = counts.pending ?? 0;
        if (completedEl) completedEl.textContent = counts.completed ?? 0;
    }

    function resetSelection() {
        document.querySelectorAll(".check-item-duyet").forEach(cb => { cb.checked = false; });
        const checkAll = document.getElementById("checkAllDuyet");
        if (checkAll) checkAll.checked = false;
        const btnDel = document.getElementById("btnDeleteSelectedDuyet");
        if (btnDel) {
            btnDel.style.display = "none";
            const counter = btnDel.querySelector(".selected-count");
            if (counter) counter.textContent = "0";
        }
    }

    function loadDanhSach(page = 1) {
        const tbody = document.getElementById("duyetTableBody");
        if (!tbody) return;

        setTableEmpty(tbody, false);
        showLoading();
        if (typeof window.renderTableSkeleton === "function") {
            window.renderTableSkeleton(tbody, pageSize > 8 ? 8 : pageSize, 8);
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted py-4"><div class="spinner-border spinner-border-sm text-primary me-2"></div> Đang tải...</td>
                </tr>`;
        }

        fetch(`/Admin/AdminSuscesWord/GetList?page=${page}&pageSize=${pageSize}&keyword=${encodeURIComponent(searchKeyword)}&khoa=${encodeURIComponent(khoa)}&status=${encodeURIComponent(currentStatus)}`)
            .then(r => r.json())
            .then(res => {
                const data = res.data || [];
                currentPage = res.currentPage || 1;
                totalPages = res.totalPages || 1;
                updateTabCounts(res.counts);

                tbody.innerHTML = "";

                /* ===== KHÔNG CÓ DỮ LIỆU ===== */
                if (data.length === 0) {
                    const hasFilter = searchKeyword || khoa;
                    const emptyTitle = hasFilter
                        ? "Không tìm thấy dữ liệu"
                        : (currentStatus === "completed" ? "Chưa có sinh viên đã xác nhận" : "Chưa có dữ liệu");
                    const emptyDesc = hasFilter
                        ? "Thử điều chỉnh từ khóa hoặc bộ lọc khoa."
                        : (currentStatus === "completed"
                            ? "Các sinh viên đã được xác nhận hoàn thành sẽ hiển thị tại đây."
                            : "Danh sách xác nhận hoàn thành sẽ hiển thị tại đây.");
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="8" class="py-5">
                                <div class="admin-empty-state">
                                    <i class="fas fa-inbox"></i>
                                    <strong>${emptyTitle}</strong>
                                    <span>${emptyDesc}</span>
                                </div>
                            </td>
                        </tr>`;
                    setTableEmpty(tbody, true);
                    hideLoading();
                    return;
                }

                setTableEmpty(tbody, false);

                /* ===== RENDER ROW ===== */
                data.forEach((item, index) => {
                    let mssvText = (item.MSSV || "").toString().trim();
                    if (mssvText.length === 9) mssvText = "0" + mssvText;

                    const actionHtml = currentStatus === "completed"
                        ? `<td class="action-cell text-center">
                                <span class="badge bg-success-subtle text-success fw-semibold px-2 py-1">
                                    <i class="fas fa-circle-check me-1"></i>Đã xác nhận
                                </span>
                                <div class="small text-muted mt-1">${item.NgayXacNhan || ""}</div>
                           </td>`
                        : `<td class="action-cell text-center">
                                <button class="btn btn-sm btn-success btn-duyet" 
                                        data-id="${item.id}" 
                                        data-mssv="${mssvText}"
                                        data-hoten="${(item.HoTen || '').replace(/"/g, '&quot;')}"
                                        data-lop="${(item.Lop || '').replace(/"/g, '&quot;')}"
                                        data-khoa="${(item.Khoa || '').replace(/"/g, '&quot;')}"
                                        data-songay="${item.SoNgay ?? 0}"
                                        title="Duyệt hoàn thành">
                                    <i class="fas fa-check"></i>
                                </button>
                           </td>`;

                    const tr = document.createElement("tr");
                    tr.className = "fade-in-data";
                    tr.innerHTML = `
                        <td class="text-center"><input type="checkbox" class="form-check-input check-item-duyet" value="${item.id}"></td>
                        <td class="stt-cell">${(currentPage - 1) * pageSize + index + 1}</td>
                        <td class="text-center fw-semibold text-primary">${mssvText || ""}</td>
                        <td class="text-start fw-semibold">${item.HoTen || ""}</td>
                        <td class="text-start">${item.Lop || ""}</td>
                        <td class="text-start">${item.Khoa || ""}</td>
                        <td class="text-center"><span class="badge ${currentStatus === "completed" ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning-emphasis"} fw-bold px-2 py-1">${item.SoNgay ?? 0} ngày</span></td>
                        ${actionHtml}`;
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

    /* ================== TABS TRẠNG THÁI ================== */
    const statusTabs = document.querySelectorAll("#duyetTabs .role-tab-btn");
    statusTabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
            const nextStatus = this.dataset.status || "pending";
            if (nextStatus === currentStatus) return;

            currentStatus = nextStatus;
            statusTabs.forEach(t => t.classList.toggle("active", t === this));
            currentPage = 1;
            resetSelection();
            loadDanhSach(1);
        });
    });

    /* ================== DUYỆT CÓ GIAO DIỆN MODAL RIÊNG (KHÔNG DÙNG ALERT) ================== */
    let currentDuyetId = null;

    function openModalById(modalId) {
        const modalEl = document.getElementById(modalId);
        if (!modalEl) return;
        if (window.bootstrap && bootstrap.Modal) {
            bootstrap.Modal.getOrCreateInstance(modalEl).show();
        } else if (window.$ && typeof $.fn.modal === "function") {
            $(modalEl).modal("show");
        }
    }

    function closeModalById(modalId) {
        const modalEl = document.getElementById(modalId);
        if (!modalEl) return;
        if (window.bootstrap && bootstrap.Modal) {
            const inst = bootstrap.Modal.getInstance(modalEl);
            if (inst) inst.hide();
        } else if (window.$ && typeof $.fn.modal === "function") {
            $(modalEl).modal("hide");
        }
    }

    document.addEventListener("click", e => {
        const btn = e.target.closest(".btn-duyet");
        if (!btn) return;

        currentDuyetId = btn.dataset.id;
        const mssv = btn.dataset.mssv || "";
        const hoten = btn.dataset.hoten || "";
        const lop = btn.dataset.lop || "";
        const khoa = btn.dataset.khoa || "";
        const songay = btn.dataset.songay || "18";

        const mssvEl = document.getElementById("duyetModalMSSV");
        const hotenEl = document.getElementById("duyetModalHoTen");
        const lopEl = document.getElementById("duyetModalLop");
        const khoaEl = document.getElementById("duyetModalKhoa");
        const songayEl = document.getElementById("duyetModalSoNgay");

        if (mssvEl) mssvEl.textContent = mssv;
        if (hotenEl) hotenEl.textContent = hoten;
        if (lopEl) lopEl.textContent = lop;
        if (khoaEl) khoaEl.textContent = khoa;
        if (songayEl) songayEl.textContent = `${songay} ngày`;

        openModalById("modalConfirmDuyetSusces");
    });

    const btnSubmitConfirm = document.getElementById("btnSubmitConfirmDuyet");
    if (btnSubmitConfirm) {
        btnSubmitConfirm.addEventListener("click", function () {
            if (!currentDuyetId) return;
            thucHienDuyet(currentDuyetId, this);
        });
    }

    function thucHienDuyet(id, triggerBtn) {
        if (triggerBtn) {
            triggerBtn.disabled = true;
            triggerBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Đang phê duyệt...';
        }

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
                if (triggerBtn) {
                    triggerBtn.disabled = false;
                    triggerBtn.innerHTML = '<i class="fas fa-check-circle me-1"></i> Xác Nhận Phê Duyệt';
                }

                closeModalById("modalConfirmDuyetSusces");

                if (res.success) {
                    // Mở Modal Thông Báo Thành Công riêng biệt (không dùng alert)
                    const successMsgEl = document.getElementById("duyetSuccessMessage");
                    const iconWrapper = document.getElementById("duyetSuccessIconWrapper");
                    const iconEl = document.getElementById("duyetSuccessIcon");
                    const titleEl = document.getElementById("duyetSuccessTitle");
                    const boxEl = document.getElementById("duyetSuccessMessageBox");

                    if (res.isEmailSent === false) {
                        if (iconWrapper) iconWrapper.className = "d-inline-flex align-items-center justify-content-center bg-warning text-white rounded-circle shadow-sm mb-3";
                        if (iconEl) iconEl.className = "fas fa-exclamation-triangle";
                        if (titleEl) titleEl.textContent = "Đã Duyệt (Có Lưu Ý Về Email)";
                        if (boxEl) boxEl.className = "p-3 bg-warning-subtle border border-warning text-dark rounded-3 text-start small mb-0";
                    } else {
                        if (iconWrapper) iconWrapper.className = "d-inline-flex align-items-center justify-content-center bg-success text-white rounded-circle shadow-sm mb-3";
                        if (iconEl) iconEl.className = "fas fa-check";
                        if (titleEl) titleEl.textContent = "Phê Duyệt Thành Công!";
                        if (boxEl) boxEl.className = "p-3 bg-light rounded-3 text-start small mb-0";
                    }

                    if (successMsgEl) {
                        successMsgEl.textContent = res.message || "Đã xác nhận hoàn thành nghĩa vụ lao động và khóa tài khoản thành công!";
                    }
                    openModalById("modalDuyetSuccessSusces");

                    // Tải lại dữ liệu trang
                    loadDanhSach(currentPage);
                } else {
                    if (typeof window.showToast === "function") {
                        window.showToast(res.message || "Duyệt thất bại!", "error");
                    }
                }
            })
            .catch(err => {
                console.error("Lỗi duyệt hoàn thành:", err);
                if (triggerBtn) {
                    triggerBtn.disabled = false;
                    triggerBtn.innerHTML = '<i class="fas fa-check-circle me-1"></i> Xác Nhận Phê Duyệt';
                }
                closeModalById("modalConfirmDuyetSusces");
                if (typeof window.showToast === "function") {
                    window.showToast("Lỗi kết nối máy chủ!", "error");
                }
            });
    }

    /* ================== INIT ================== */
    window.loadDanhSach = loadDanhSach;
    setTimeout(() => loadDanhSach(1), 300);
});
