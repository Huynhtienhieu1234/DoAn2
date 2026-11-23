const MUC_TIEU = 18; // Mục tiêu 18 ngày công

document.addEventListener("DOMContentLoaded", function () {

    // =========================================================================
    // 1. TIẾN ĐỘ CÁ NHÂN: LẤY CHI TIẾT NGÀY LAO ĐỘNG BẢN THÂN
    // =========================================================================
    fetch("/Student/StudentTK/GetChiTietNgay")
        .then(res => res.json())
        .then(data => {
            const chiTietBody = document.getElementById("chiTietBody");
            const loadingChiTiet = document.getElementById("loadingChiTiet");

            if (loadingChiTiet) loadingChiTiet.style.display = "none";

            if (data.message === "Phiên đăng nhập hết hạn.") {
                window.location.href = "/Login/Login";
                return;
            }

            if (data.success && Array.isArray(data.list) && data.list.length > 0) {
                chiTietBody.innerHTML = data.list.map((item, index) => `
                    <tr>
                        <td class="fw-bold text-muted">${index + 1}</td>
                        <td><span class="badge bg-light text-dark border">${item.Buoi || ""}</span></td>
                        <td class="fw-bold">${item.Ngay || ""}</td>
                        <td>${item.LoaiLaoDong || ""}</td>
                        <td><i class="fas fa-map-marker-alt text-danger me-1"></i>${item.DiaDiem || ""}</td>
                    </tr>
                `).join("");
            } else {
                chiTietBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="student-empty py-4">
                            <i class="fas fa-inbox fa-2x text-muted mb-2"></i>
                            <p class="student-empty-title fw-bold text-secondary">Chưa có dữ liệu ngày lao động</p>
                            <p class="student-empty-text text-muted small">Các ngày lao động bạn đã điểm danh sẽ xuất hiện tại đây.</p>
                        </td>
                    </tr>
                `;
            }
        })
        .catch(err => {
            console.error("Lỗi tải chi tiết ngày lao động:", err);
            const body = document.getElementById("chiTietBody");
            if (body) {
                body.innerHTML = `
                    <tr>
                        <td colspan="5" class="student-empty is-error py-4">
                            <i class="fas fa-triangle-exclamation text-danger fa-2x mb-2"></i>
                            <p class="student-empty-title text-danger fw-bold">Không thể tải dữ liệu</p>
                            <p class="student-empty-text text-muted small">Vui lòng kiểm tra kết nối và thử lại.</p>
                        </td>
                    </tr>
                `;
            }
        });

    // =========================================================================
    // 2. TIẾN ĐỘ CÁ NHÂN: TỔNG QUAN STATS BẢN THÂN
    // =========================================================================
    fetch("/Student/StudentTK/GetThongKe")
        .then(res => res.json())
        .then(data => {
            if (data.message === "Phiên đăng nhập hết hạn.") {
                window.location.href = "/Login/Login";
                return;
            }

            if (!data.success) return;

            const elTongDot = document.getElementById("tongDot");
            const elDaDuyet = document.getElementById("daDuyet");
            const elDaDiemDanh = document.getElementById("daDiemDanh");
            const elHoanThanh = document.getElementById("hoanThanh");

            if (elTongDot) elTongDot.innerText = data.tongDot;
            if (elDaDuyet) elDaDuyet.innerText = data.daDuyet;
            if (elDaDiemDanh) elDaDiemDanh.innerText = data.daDiemDanh;
            if (elHoanThanh) elHoanThanh.innerText = data.hoanThanh;

            const progressBar = document.getElementById("progressBar");
            if (progressBar) {
                const percent = Math.min((data.hoanThanh / MUC_TIEU) * 100, 100);
                progressBar.style.width = percent + "%";
                progressBar.innerText = `${data.hoanThanh} / ${MUC_TIEU} ngày (${percent.toFixed(1)}%)`;
                if (data.hoanThanh >= MUC_TIEU) {
                    progressBar.className = "progress-bar bg-success fw-bold";
                }
            }
        })
        .catch(err => console.error("Lỗi thống kê cá nhân:", err));

    // =========================================================================
    // 3. CHỨC NĂNG LỚP TRƯỞNG: QUẢN LÝ TIẾN ĐỘ CẢ LỚP
    // =========================================================================
    const tabCaNhan = document.getElementById("tabCaNhan");
    const tabLop = document.getElementById("tabLop");
    const sectionCaNhan = document.getElementById("sectionCaNhan");
    const sectionLop = document.getElementById("sectionLop");

    let isClassLoaded = false;
    let searchTimeout = null;

    if (tabCaNhan && tabLop && sectionCaNhan && sectionLop) {
        tabCaNhan.addEventListener("click", function () {
            tabCaNhan.classList.add("active");
            tabCaNhan.setAttribute("aria-selected", "true");
            tabLop.classList.remove("active");
            tabLop.setAttribute("aria-selected", "false");
            sectionCaNhan.style.display = "block";
            sectionLop.style.display = "none";
        });

        tabLop.addEventListener("click", function () {
            tabLop.classList.add("active");
            tabLop.setAttribute("aria-selected", "true");
            tabCaNhan.classList.remove("active");
            tabCaNhan.setAttribute("aria-selected", "false");
            sectionLop.style.display = "block";
            sectionCaNhan.style.display = "none";

            if (!isClassLoaded) {
                loadClassStats();
            }
        });

        // Tìm kiếm & Lọc
        const searchInput = document.getElementById("searchSVLop");
        const filterSelect = document.getElementById("filterTrangThaiLop");

        if (searchInput) {
            searchInput.addEventListener("input", function () {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    loadClassStats();
                }, 350);
            });
        }

        if (filterSelect) {
            filterSelect.addEventListener("change", function () {
                loadClassStats();
            });
        }
    }

    // Hàm gọi API tải tiến độ lớp
    function loadClassStats() {
        const searchInput = document.getElementById("searchSVLop");
        const filterSelect = document.getElementById("filterTrangThaiLop");
        const keyword = searchInput ? searchInput.value.trim() : "";
        const filter = filterSelect ? filterSelect.value : "";

        // Cập nhật link export Excel
        const btnExport = document.getElementById("btnExportExcelLop");
        if (btnExport) {
            btnExport.href = `/Student/StudentTK/ExportExcelLop?keyword=${encodeURIComponent(keyword)}&filter=${encodeURIComponent(filter)}`;
        }

        const tbody = document.getElementById("tableBodyLop");
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="student-empty py-5">
                    <div class="spinner-border text-primary spinner-border-sm" role="status">
                        <span class="visually-hidden">Đang tải...</span>
                    </div>
                    <p class="mt-2 mb-0 text-muted">Đang cập nhật danh sách thành viên lớp...</p>
                </td>
            </tr>
        `;

        fetch(`/Student/StudentTK/GetThongKeLop?keyword=${encodeURIComponent(keyword)}&filter=${encodeURIComponent(filter)}`)
            .then(res => res.json())
            .then(res => {
                if (!res.success) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="7" class="text-danger py-4 text-center">
                                <i class="fas fa-exclamation-circle me-1"></i> ${res.message || "Lỗi tải dữ liệu"}
                            </td>
                        </tr>
                    `;
                    return;
                }

                isClassLoaded = true;

                // Cập nhật các thẻ số liệu
                const elSiSo = document.getElementById("tongSiSoLop");
                const elHoanThanh = document.getElementById("soHoanThanhLop");
                const elChuaHoanThanh = document.getElementById("soChuaHoanThanhLop");
                const elTyLe = document.getElementById("tyLeHoanThanhLop");
                const badgeSiSo = document.getElementById("badgeTongSiSo");
                const tyLeText = document.getElementById("tyLeTextLop");
                const progressBarLop = document.getElementById("progressBarLop");

                if (elSiSo) elSiSo.textContent = res.tongSiSo;
                if (elHoanThanh) elHoanThanh.textContent = res.soHoanThanh;
                if (elChuaHoanThanh) elChuaHoanThanh.textContent = res.soChuaHoanThanh;
                if (elTyLe) elTyLe.textContent = res.tyLeLop + "%";
                if (badgeSiSo) badgeSiSo.textContent = res.tongSiSo + " sinh viên";
                if (tyLeText) tyLeText.textContent = `${res.soHoanThanh} / ${res.tongSiSo} bạn đạt chuẩn (${res.tyLeLop}%)`;

                if (progressBarLop) {
                    progressBarLop.style.width = res.tyLeLop + "%";
                    progressBarLop.textContent = res.tyLeLop + "%";
                }

                // Render bảng danh sách sinh viên
                if (Array.isArray(res.data) && res.data.length > 0) {
                    tbody.innerHTML = res.data.map((sv, idx) => {
                        const statusBadge = sv.IsCompleted
                            ? `<span class="badge bg-success bg-opacity-10 text-success border border-success-subtle px-2 py-1"><i class="fas fa-check-circle me-1"></i> Đã hoàn thành</span>`
                            : `<span class="badge bg-warning bg-opacity-10 text-warning-emphasis border border-warning-subtle px-2 py-1"><i class="fas fa-clock me-1"></i> Đang tích lũy</span>`;

                        const barColor = sv.IsCompleted ? "bg-success" : "bg-primary";

                        return `
                            <tr>
                                <td class="fw-bold text-muted">${idx + 1}</td>
                                <td class="fw-bold text-primary font-monospace">${sv.MSSV}</td>
                                <td style="text-align: left;">
                                    <div class="fw-bold text-dark">${sv.HoTen}</div>
                                    <div class="text-muted small">${sv.NgaySinh ? `<i class="far fa-calendar-alt me-1"></i>${sv.NgaySinh}` : ''}</div>
                                </td>
                                <td>${sv.GioiTinh || ""}</td>
                                <td>
                                    <div class="d-flex align-items-center gap-2">
                                        <div class="flex-grow-1" style="height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden;">
                                            <div class="progress-bar ${barColor}" role="progressbar" style="width: ${sv.PhanTram}%; height: 100%;"></div>
                                        </div>
                                        <span class="small fw-bold text-nowrap">${sv.TongSoNgay}/18 ngày</span>
                                    </div>
                                    <div class="text-muted small mt-1" style="font-size: 0.75rem;">
                                        Đã làm: <strong>${sv.SoCaDiemDanh} ca</strong> | Đăng ký: <strong>${sv.SoCaDangKy} ca</strong>
                                    </div>
                                </td>
                                <td>${statusBadge}</td>
                                <td>
                                    <button type="button" class="btn btn-sm btn-outline-primary px-3 py-1 rounded-pill btn-view-sv-detail" 
                                            data-mssv="${sv.MSSV}" data-hoten="${sv.HoTen}" data-ngay="${sv.TongSoNgay}">
                                        <i class="fas fa-eye me-1"></i> Xem ca
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join("");

                    // Gắn sự kiện xem chi tiết từng sinh viên
                    document.querySelectorAll(".btn-view-sv-detail").forEach(btn => {
                        btn.addEventListener("click", function () {
                            const mssv = this.dataset.mssv;
                            const hoten = this.dataset.hoten;
                            const ngay = this.dataset.ngay;
                            openStudentDetailModal(mssv, hoten, ngay);
                        });
                    });

                } else {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="7" class="student-empty py-4 text-center">
                                <i class="fas fa-search fa-2x text-muted mb-2"></i>
                                <p class="student-empty-title fw-bold text-secondary">Không tìm thấy sinh viên</p>
                                <p class="student-empty-text text-muted small">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.</p>
                            </td>
                        </tr>
                    `;
                }
            })
            .catch(err => {
                console.error("Lỗi tải tiến độ lớp:", err);
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-danger py-4 text-center">
                            <i class="fas fa-exclamation-triangle me-1"></i> Không thể kết nối đến máy chủ. Vui lòng thử lại!
                        </td>
                    </tr>
                `;
            });
    }

    // =========================================================================
    // 4. MODAL XEM CHI TIẾT CÁC CA LAO ĐỘNG CỦA MỘT SINH VIÊN
    // =========================================================================
    function openStudentDetailModal(mssv, hoten, ngay) {
        const modalEl = document.getElementById("modalChiTietSVLop");
        if (!modalEl) return;

        document.getElementById("modalSVHoTen").textContent = hoten || "--";
        document.getElementById("modalSVMSSV").textContent = mssv || "--";
        document.getElementById("modalSVTongNgay").textContent = `${ngay || 0} / 18 ngày công`;

        const modalTableBody = document.getElementById("modalSVTableBody");
        modalTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4 text-muted">
                    <div class="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                    Đang tải lịch sử ca lao động...
                </td>
            </tr>
        `;

        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        fetch(`/Student/StudentTK/GetChiTietLaoDongSinhVien?mssv=${mssv}`)
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    document.getElementById("modalSVLop").textContent = res.tenLop || "--";
                    document.getElementById("modalSVTongNgay").textContent = `${res.soNgay} / 18 ngày công`;

                    if (Array.isArray(res.list) && res.list.length > 0) {
                        modalTableBody.innerHTML = res.list.map((item, idx) => `
                            <tr>
                                <td class="fw-bold text-muted">${idx + 1}</td>
                                <td class="fw-bold text-start ps-3">${item.TieuDe}</td>
                                <td><span class="badge bg-light text-dark border">${item.Buoi}</span></td>
                                <td>${item.Ngay}</td>
                                <td><i class="fas fa-map-marker-alt text-danger me-1"></i>${item.DiaDiem}</td>
                                <td class="small text-muted font-monospace">${item.ThoiGianDiemDanh}</td>
                            </tr>
                        `).join("");
                    } else {
                        modalTableBody.innerHTML = `
                            <tr>
                                <td colspan="6" class="text-center py-4 text-muted">
                                    <i class="fas fa-info-circle me-1"></i> Sinh viên này chưa hoàn thành ca lao động nào.
                                </td>
                            </tr>
                        `;
                    }
                } else {
                    modalTableBody.innerHTML = `
                        <tr>
                            <td colspan="6" class="text-center text-danger py-4">
                                <i class="fas fa-exclamation-triangle me-1"></i> ${res.message || "Lỗi tải chi tiết"}
                            </td>
                        </tr>
                    `;
                }
            })
            .catch(err => {
                console.error("Lỗi tải chi tiết ca của SV:", err);
                modalTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-danger py-4">
                            <i class="fas fa-exclamation-triangle me-1"></i> Không thể tải dữ liệu chi tiết ca.
                        </td>
                    </tr>
                `;
            });
    }

});
