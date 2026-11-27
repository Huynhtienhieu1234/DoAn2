// Quản lý Đợt Lao Động - Full JS
document.addEventListener("DOMContentLoaded", function () {



    // Map khu vực → ảnh GitHub
    const khuVucImages = {
        "A1": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/1.jpg",
        "A2": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/2.jpg",
        "B1": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/3.jpg",
        "B2": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/4.jpg",
        "B3": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/5.jpg",
        "B4": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/6.jpg",
        "C1": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/7.jpg",
        "C2": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/8.jpg",
        "H1": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/9.jpg",
        "H2": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/10.jpg",
        "T2": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/11.jpg",
        "Trước cổng trường": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/12.jpg"
    };

    // Hàm hiển thị ảnh theo khu vực
    function setAreaImage(imgEl, areaValue) {
        const url = khuVucImages[areaValue] || "";
        if (url) {
            imgEl.src = url;
            imgEl.style.display = "block";
            imgEl.onerror = function () {
                this.style.display = "none";
                showToast("Không tải được ảnh khu vực: " + areaValue, "warning");
            };
        } else {
            imgEl.style.display = "none";
        }
    }

    // Gắn sự kiện cho dropdown trong form Tạo mới
    document.getElementById("createKhuVuc")?.addEventListener("change", function () {
        setAreaImage(document.getElementById("createKhuVucImage"), this.value);
        const lbl = document.getElementById("createKhuVucLabel");
        if (lbl) lbl.textContent = this.options[this.selectedIndex]?.text || this.value;
    });

    // Gắn sự kiện cho dropdown trong form Chỉnh sửa
    document.getElementById("editKhuVuc")?.addEventListener("change", function () {
        setAreaImage(document.getElementById("editKhuVucImage"), this.value);
        const lbl = document.getElementById("editKhuVucLabel");
        if (lbl) lbl.textContent = this.options[this.selectedIndex]?.text || this.value;
    });

    // Nút chuyển chế độ xem ảnh khu vực (Tràn viền / Toàn cảnh)
    document.addEventListener("click", function (e) {
        const btn = e.target.closest(".btn-toggle-fit");
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        const frame = btn.closest(".khuvuc-frame");
        const img = frame ? frame.querySelector("img") : null;
        if (!img) return;
        const span = btn.querySelector("span");
        const icon = btn.querySelector("i");
        if (img.style.objectFit === "contain") {
            img.style.objectFit = "cover";
            if (span) span.textContent = "Toàn cảnh";
            if (icon) { icon.className = "fas fa-expand me-1"; }
        } else {
            img.style.objectFit = "contain";
            if (span) span.textContent = "Tràn viền";
            if (icon) { icon.className = "fas fa-compress me-1"; }
        }
    });







    let currentPage = 1;
    const pageSizeSelector = document.getElementById("pageSizeDot") || document.getElementById("pageSizeSelector");
    let pageSize = pageSizeSelector ? (parseInt(pageSizeSelector.value, 10) || 10) : 10;
    let currentLoadedItems = []; // chứa dữ liệu đang hiển thị

    if (pageSizeSelector) {
        pageSizeSelector.addEventListener("change", function () {
            pageSize = parseInt(this.value, 10) || 10;
            currentPage = 1;
            loadDataToTable(1);
        });
    }


    let currentSortField = "date";
    let currentSortDir = "desc";
    let thang = "";

    // ==============================
    // 1) Tải dữ liệu lần đầu
    // ==============================
    window.loadDataToTable = loadDataToTable;
    loadDataToTable();

    // ==============================
    // 2) Hàm load dữ liệu + loading
    // ==============================
    document.getElementById("createForm")?.addEventListener("submit", function (e) {
        e.preventDefault();

        const formData = new FormData(this);

        fetch(this.action, { method: "POST", body: formData })
            .then((res) => {
                if (!res.ok) {
                    return res.text().then(text => {
                        console.error("Server response:", text);
                        throw new Error("Server error");
                    });
                }
                return res.json();
            })
            .then((data) => {
                if (data.success) {
                    const modalInstance = bootstrap.Modal.getInstance(document.getElementById("createModal"));
                    if (modalInstance) modalInstance.hide();

                    if (typeof Swal !== 'undefined') {
                        Swal.fire({
                            icon: 'success',
                            title: 'Thành công!',
                            text: data.message || "Tạo đợt lao động thành công!",
                            confirmButtonText: 'Tuyệt vời',
                            confirmButtonColor: '#198754'
                        });
                    } else if (typeof showToast === 'function') {
                        showToast(data.message || "Tạo đợt thành công!", "success");
                    } else {
                        alert(data.message || "Tạo đợt thành công!");
                    }

                    // Tải lại dữ liệu
                    loadDataToTable(currentPage);
                } else {
                    if (typeof Swal !== 'undefined') {
                        Swal.fire({
                            icon: 'error',
                            title: 'Thêm thất bại!',
                            text: data.message || "Tạo đợt thất bại!",
                            confirmButtonText: 'Đóng & Thử lại',
                            confirmButtonColor: '#dc3545'
                        });
                    } else if (typeof showToast === 'function') {
                        showToast(data.message || "Tạo thất bại!", "error");
                    } else {
                        alert(data.message || "Tạo thất bại!");
                    }
                }
            })
            .catch((err) => {
                console.error("Lỗi:", err);
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'error',
                        title: 'Lỗi kết nối',
                        text: 'Lỗi kết nối hoặc server không phản hồi: ' + err,
                        confirmButtonText: 'Đóng',
                        confirmButtonColor: '#dc3545'
                    });
                } else if (typeof showToast === 'function') {
                    showToast("Lỗi kết nối hoặc server không phản hồi.", "error");
                } else {
                    alert("Lỗi kết nối hoặc server không phản hồi.");
                }
            });
    });

    function isDateSearch(value) {
        return /^\d{2}\/\d{2}\/\d{4}$/.test(value);
    }

    function convertToISODate(ddmmyyyy) {
        const [day, month, year] = ddmmyyyy.split('/');
        return `${year}-${month}-${day}`;
    }




    function loadDataToTable(page = 1, keyword = "", buoi = "", trangthai = "") {

        // ===== XỬ LÝ SEARCH BOX =====
        const keywordRaw = document.getElementById("searchBox")?.value.trim() || "";

        let keywordFinal = "";
        let ngay = "";

        if (isDateSearch(keywordRaw)) {
            ngay = convertToISODate(keywordRaw); // yyyy-MM-dd
        } else {
            keywordFinal = keywordRaw;
        }
        // ============================


        // Kiểm tra nếu từ khóa là ngày tháng
        const tbody = document.getElementById("dotLaoDongTableBody");
        const tableWrapper = document.querySelector(".table-responsive");

        if (tableWrapper) tableWrapper.classList.remove("loading");
        
        // Hiển thị Skeleton Loading cho cả Giao diện Catalog Thẻ và Bảng Truyền Thống
        if (typeof window.renderCatalogSkeleton === "function") {
            window.renderCatalogSkeleton("#dotCatalogContainer", pageSize > 6 ? 6 : pageSize);
        }
        if (typeof window.renderTableSkeleton === "function" && tbody) {
            window.renderTableSkeleton(tbody, pageSize > 6 ? 6 : pageSize, 11);
        } else if (tbody) {
            tbody.innerHTML = `<tr><td colspan="11" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-primary me-2"></div> Đang tải dữ liệu...</td></tr>`;
        }

        fetch(`/Admin/AdminWordRegister/LoadDotLaoDong?page=${page}&pageSize=${pageSize}&keyword=${encodeURIComponent(keywordFinal)}&buoi=${encodeURIComponent(buoi)}&trangThai=${encodeURIComponent(trangthai)}&ngay=${encodeURIComponent(ngay)}&thang=${thang ?? ""}&sortField=${currentSortField}&sortDir=${currentSortDir}`)
            .then(res => res.json())

            .then(data => {
                currentLoadedItems = data.items || [];
                tableWrapper.classList.remove("loading");

                if (!data.items || data.items.length === 0) {
                    tbody.innerHTML = "<tr><td colspan='11' class='text-center'>Không có dữ liệu</td></tr>";
                    renderPagination(page, data.totalPages || 1);
                    return;
                }

                setTimeout(() => {
                    renderDataToTable(data.items, page);
                    renderPagination(page, data.totalPages || 1);
                }, 120);
            })
            .catch(() => {
                tableWrapper.classList.remove("loading");
                tbody.innerHTML = "<tr><td colspan='11' class='text-center text-danger'>Lỗi tải dữ liệu</td></tr>";
            });
    }





    function setSort(field) {
        if (currentSortField === field) {
            currentSortDir = currentSortDir === "asc" ? "desc" : "asc";
        } else {
            currentSortField = field;
            currentSortDir = "asc";
        }

        localStorage.setItem("sortField", currentSortField);
        localStorage.setItem("sortDir", currentSortDir);

        currentPage = 1;
        triggerReload();
    }


    // ==============================
    // 3) HÀM HỖ TRỢ XỬ LÝ NGÀY & GIAO DIỆN CATALOG THỜI KHÓA BIỂU
    // ==============================
    function parseDateVN(dateStr) {
        if (!dateStr) return null;
        let parts;
        if (dateStr.includes("/")) {
            parts = dateStr.split("/");
            if (parts.length === 3) {
                return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            }
        } else if (dateStr.includes("-")) {
            parts = dateStr.split("-");
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                } else {
                    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                }
            }
        }
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
    }

    function getThuTrongTuan(d) {
        if (!d) return "Lịch LĐ";
        const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
        return days[d.getDay()] || "Lịch LĐ";
    }

    // ==============================
    // RENDER CATALOG THỜI KHÓA BIỂU
    // ==============================
    function renderDataToCatalog(items, page) {
        const catalogContainer = document.getElementById("dotCatalogContainer");
        if (!catalogContainer) return;

        if (!items || items.length === 0) {
            catalogContainer.innerHTML = `
                <div class="col-12 py-5 text-center text-muted">
                    <i class="fas fa-calendar-times fa-3x mb-3 text-secondary opacity-50"></i>
                    <p class="fs-6 fw-semibold mb-1">Không tìm thấy đợt lao động nào</p>
                    <small>Hãy thử đổi bộ lọc hoặc tạo đợt lao động mới</small>
                </div>`;
            return;
        }

        catalogContainer.innerHTML = items.map((item, index) => {
            let buoiText = item.Buoi || '';
            let isSang = buoiText.includes("Sáng");
            let buoiDisplay = isSang ? "Sáng (7h-8h30)" : (buoiText.includes("Chiều") ? "Chiều (13h-14h)" : buoiText);

            const isLoaiLop = item.LoaiLaoDong === "Lớp";
            const soLopDaDangKy = item.SoLuongLopDaDangKy || 0;
            const tongLopCan = item.SoLuongLop || item.TongSoLopCan || 1;

            const soLuongDangKy = isLoaiLop ? soLopDaDangKy : (item.SoLuongDangKy || 0);
            const quyDinh = isLoaiLop ? tongLopCan : (item.SoLuongSinhVien || 20);

            let percent = quyDinh > 0 ? Math.min(100, Math.round((soLuongDangKy / quyDinh) * 100)) : 0;
            let progressColor = percent >= 100 ? "bg-primary" : (percent >= 75 ? "bg-warning" : "bg-success");
            let mauDangKy = percent >= 100 ? "text-primary" : (soLuongDangKy < quyDinh ? "text-danger" : "text-success");

            // Parse ngày để lấy Thứ trong tuần
            const dateObj = parseDateVN(item.NgayLaoDong);
            const dayOfWeek = getThuTrongTuan(dateObj);

            // Badge trạng thái Catalog
            let statusBadge = "";
            if (item.TrangThaiDot === 'Tạm ngưng' || item.TrangThaiDuyet === 'Tạm ngưng') {
                statusBadge = `<span class="badge badge-catalog-status status-tamngung"><i class="fas fa-pause-circle me-1"></i>Tạm ngưng</span>`;
            } else if (item.TrangThaiDuyet === 'Đã duyệt') {
                statusBadge = `<span class="badge badge-catalog-status status-daduyet"><i class="fas fa-check-circle me-1"></i>Đã duyệt</span>`;
            } else if (item.TrangThaiDuyet === 'Kết thúc') {
                statusBadge = `<span class="badge badge-catalog-status status-ketthuc"><i class="fas fa-ban me-1"></i>Kết thúc</span>`;
            } else {
                statusBadge = `<span class="badge badge-catalog-status status-chuaduyet"><i class="fas fa-clock me-1"></i>Chưa duyệt</span>`;
            }

            const mota = (item.MoTa || '').replace(/"/g, '&quot;').replace(/\n/g, ' ');
            const nguoitao = String(item.NguoiTao || '').replace(/"/g, '&quot;');

            return `
            <div class="col-xl-4 col-lg-6 col-md-6 col-12 fade-in-data">
                <div class="card schedule-catalog-card h-100" 
                     data-id="${item.TaoDotLaoDong_id}"
                     data-mota="${mota}"
                     data-nguoitao="${nguoitao}">
                    
                    <!-- CARD HEADER: THỜI GIAN & BUỔI (RIBBON THỜI KHÓA BIỂU) -->
                    <div class="card-schedule-header d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center gap-2">
                            <input type="checkbox" class="form-check-input check-item-dot" value="${item.TaoDotLaoDong_id}" title="Chọn đợt này">
                            <div class="schedule-date-box">
                                <span class="schedule-day-name">${dayOfWeek}</span>
                                <span class="schedule-date-val"><i class="far fa-calendar-alt text-primary me-1"></i>${item.NgayLaoDong || ''}</span>
                            </div>
                        </div>
                        <div class="d-flex align-items-center gap-1">
                            <span class="badge badge-buoi ${isSang ? 'buoi-sang' : 'buoi-chieu'}">
                                <i class="${isSang ? 'fas fa-sun' : 'fas fa-cloud-moon'} me-1"></i>${isSang ? 'Sáng' : 'Chiều'}
                            </span>
                            ${statusBadge}
                        </div>
                    </div>

                    <!-- CARD BODY: THÔNG TIN ĐỢT, ĐỊA ĐIỂM, TIẾN ĐỘ ĐĂNG KÝ -->
                    <div class="card-schedule-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="schedule-title mb-0 fw-bold text-dark">
                                <i class="fas fa-calendar-check text-primary me-1"></i>
                                <span class="Dotloaodong">${item.DotLaoDong || 'Đợt Lao Động'}</span>
                            </h6>
                            <div class="d-flex align-items-center gap-1">
                                <span class="badge badge-loai ${isLoaiLop ? 'loai-lop' : 'loai-canhan'}">
                                    <i class="${isLoaiLop ? 'fas fa-users' : 'fas fa-user'} me-1"></i>${item.LoaiLaoDong || 'Cá nhân'}
                                </span>
                                <span class="badge badge-giatri">
                                    +${item.GiaTri ?? 1}đ
                                </span>
                            </div>
                        </div>

                        <!-- Khu vực & Khung giờ -->
                        <div class="schedule-meta-row mb-2">
                            <div class="meta-item">
                                <span class="text-muted"><i class="fas fa-map-marker-alt text-danger me-1"></i>Khu vực:</span>
                                <span class="fw-bold text-primary ms-1">${item.KhuVuc || 'Chưa phân công'}</span>
                            </div>
                            <div class="meta-item">
                                <span class="text-muted"><i class="far fa-clock text-secondary me-1"></i>Khung giờ:</span>
                                <span class="text-dark ms-1">${buoiDisplay}</span>
                            </div>
                        </div>

                        <!-- Tiến độ đăng ký (Sĩ số) - Bấm để xem danh sách -->
                        <div class="schedule-progress-box mb-2 btn-open-sv-thamgia"
                             data-id="${item.TaoDotLaoDong_id}"
                             data-loai="${item.LoaiLaoDong || ''}"
                             style="cursor: pointer;"
                             title="Bấm để xem danh sách sinh viên đăng ký tham gia">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="small text-muted">
                                    <i class="fas fa-users me-1 text-primary"></i>${isLoaiLop ? 'Lớp đăng ký:' : 'SV đăng ký:'}
                                </span>
                                <span class="small fw-bold ${mauDangKy}">
                                    ${soLuongDangKy}/${quyDinh} ${isLoaiLop ? 'Lớp' : 'SV'} (${percent}%)
                                    <i class="fas fa-external-link-alt ms-1 text-muted" style="font-size: 0.68rem;"></i>
                                </span>
                            </div>
                            <div class="progress schedule-progress-track">
                                <div class="progress-bar ${progressColor}" role="progressbar" style="width: ${percent}%;"></div>
                            </div>
                        </div>

                        ${item.MoTa ? `
                            <div class="schedule-note text-truncate small" title="${mota}">
                                <i class="fas fa-sticky-note me-1 text-warning"></i>${item.MoTa}
                            </div>
                        ` : ''}
                    </div>

                    <!-- CARD FOOTER: HÀNG NÚT TÁC VỤ MINIMALIST -->
                    <div class="card-schedule-footer d-flex justify-content-between align-items-center">
                        <span class="text-muted small" style="font-size: 0.75rem;">
                            #${(page - 1) * pageSize + index + 1}
                        </span>
                        <div class="action-buttons-group d-flex align-items-center gap-1">
                            ${(item.TrangThaiDot === 'Tạm ngưng' || item.TrangThaiDuyet === 'Tạm ngưng') ? `
                                <button class="btn btn-sm btn-warning text-dark btn-toggle-tamngung fw-semibold px-2"
                                        data-id="${item.TaoDotLaoDong_id}"
                                        data-dotname="${item.DotLaoDong || ''}"
                                        data-status="Tạm ngưng"
                                        title="Mở lại đợt lao động">
                                    <i class="fas fa-play me-1"></i>Mở lại
                                </button>
                                <button class="btn btn-sm btn-info btn-detail-dot text-white"
                                        data-id="${item.TaoDotLaoDong_id}"
                                        data-loai="${item.LoaiLaoDong || ''}"
                                        title="Xem chi tiết đợt">
                                    <i class="fas fa-info-circle"></i>
                                </button>
                                ${(!window.isManager) ? `
                                <button class="btn btn-sm btn-danger btn-delete"
                                        data-id="${item.TaoDotLaoDong_id}"
                                        title="Xóa đợt">
                                    <i class="fas fa-trash"></i>
                                </button>` : ''}
                            ` : (item.DaDuyet || item.TrangThaiDuyet === 'Đã duyệt') ? `
                                <!-- ĐÃ DUYỆT -->
                                <button class="btn btn-sm btn-primary btn-show-code"
                                        data-id="${item.TaoDotLaoDong_id}"
                                        data-daduyet="1"
                                        title="Hiển thị mã điểm danh">
                                    <i class="fas fa-key"></i>
                                </button>
                                <button class="btn btn-sm btn-success btn-view-attendance"
                                        data-id="${item.TaoDotLaoDong_id}"
                                        data-daduyet="1"
                                        title="Giám sát danh sách điểm danh">
                                    <i class="fas fa-list-check"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-primary btn-view-participants"
                                        data-id="${item.TaoDotLaoDong_id}"
                                        data-loai="${item.LoaiLaoDong || ''}"
                                        title="Xem danh sách sinh viên tham gia">
                                    <i class="fas fa-users"></i>
                                </button>
                                <button class="btn btn-sm btn-info btn-detail-dot text-white"
                                        data-id="${item.TaoDotLaoDong_id}"
                                        data-loai="${item.LoaiLaoDong || ''}"
                                        title="Xem chi tiết đợt">
                                    <i class="fas fa-info-circle"></i>
                                </button>
                                ${(item.TrangThaiDot !== 'Kết thúc' && item.TrangThaiDuyet !== 'Kết thúc') ? `
                                <button class="btn btn-sm btn-warning text-dark btn-toggle-tamngung"
                                        data-id="${item.TaoDotLaoDong_id}"
                                        data-dotname="${item.DotLaoDong || ''}"
                                        data-status="Hoạt động"
                                        title="Tạm ngưng đợt lao động">
                                    <i class="fas fa-pause"></i>
                                </button>` : ''}
                            ` : `
                                <!-- CHƯA DUYỆT: NÚT DUYỆT ĐỢT (Nổi bật nhất, đặt đầu tiên) -->
                                <button class="btn btn-sm btn-success btn-approve px-2 py-1 fw-semibold shadow-sm"
                                        data-id="${item.TaoDotLaoDong_id}"
                                        title="Duyệt đợt lao động">
                                    <i class="fas fa-check me-1"></i>Duyệt
                                </button>
                                <button class="btn btn-sm btn-warning btn-edit"
                                        data-id="${item.TaoDotLaoDong_id}"
                                        title="Chỉnh sửa đợt">
                                    <i class="fas fa-edit"></i>
                                </button>
                                ${(!window.isManager) ? `
                                <button class="btn btn-sm btn-danger btn-delete"
                                        data-id="${item.TaoDotLaoDong_id}"
                                        title="Xóa đợt">
                                    <i class="fas fa-trash"></i>
                                </button>` : ''}
                                <button class="btn btn-sm btn-info btn-detail-dot text-white"
                                        data-id="${item.TaoDotLaoDong_id}"
                                        data-loai="${item.LoaiLaoDong || ''}"
                                        title="Xem chi tiết đợt">
                                    <i class="fas fa-info-circle"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-primary btn-view-participants"
                                        data-id="${item.TaoDotLaoDong_id}"
                                        data-loai="${item.LoaiLaoDong || ''}"
                                        title="Xem danh sách sinh viên tham gia">
                                    <i class="fas fa-users"></i>
                                </button>
                            `}
                        </div>
                    </div>

                </div>
            </div>
            `;
        }).join("");
    }

    // ==============================
    // RENDER THỜI KHÓA BIỂU TUẦN (TIMETABLE MATRIX)
    // ==============================
    let currentWeekOffset = 0;
    function renderWeeklyTimetable(items, weekOffset = 0) {
        const timetableContainer = document.getElementById("dotTimetableContainer");
        if (!timetableContainer) return;

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Thứ Hai của tuần mục tiêu
        const monday = new Date(now);
        const diffToMonday = (monday.getDay() + 6) % 7;
        monday.setDate(monday.getDate() - diffToMonday + weekOffset * 7);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        // Cập nhật tiêu đề tuần
        const fmt = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        const fmtShort = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        const weekTitle = document.getElementById("timetableWeekTitle");
        if (weekTitle) weekTitle.textContent = `Tuần: ${fmt(monday)} - ${fmt(sunday)}`;

        // Điền ngày cho các cột Thứ 2 -> CN
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const id = (i === 6) ? "ttDateCN" : "ttDate" + (i + 2);
            const el = document.getElementById(id);
            if (el) el.textContent = fmtShort(d);
        }

        // Reset tất cả các ô
        document.querySelectorAll("[id^='ttCell-']").forEach(cell => {
            cell.innerHTML = '<span class="text-muted opacity-50 small">—</span>';
        });

        // Điền đợt lao động vào các ô
        if (!items || items.length === 0) return;

        items.forEach(item => {
            const d = parseDateVN(item.NgayLaoDong);
            if (!d) return;

            // Kiểm tra xem có nằm trong tuần này không
            if (d < monday || d > sunday) return;

            const thu = d.getDay(); // 0 = CN, 1 = T2...
            const thuCol = (thu === 0) ? "CN" : (thu + 1);
            const buoi = (item.Buoi || '').toLowerCase();
            const prefix = buoi.includes("sáng") ? "sang" : (buoi.includes("chiều") ? "chieu" : null);
            if (!prefix) return;

            const cellId = `ttCell-${prefix}-${thuCol}`;
            const cell = document.getElementById(cellId);
            if (!cell) return;

            if (cell.innerHTML.includes('—')) cell.innerHTML = '';

            const isLoaiLop = item.LoaiLaoDong === "Lớp";
            const soLuongDangKy = isLoaiLop ? (item.SoLuongLopDaDangKy || 0) : (item.SoLuongDangKy || 0);
            const quyDinh = isLoaiLop ? (item.SoLuongLop || item.TongSoLopCan || 1) : (item.SoLuongSinhVien || 20);

            let badgeStatus = item.TrangThaiDuyet === 'Đã duyệt' 
                ? '<span class="badge bg-success-subtle text-success border border-success-subtle px-1 py-0" style="font-size:0.7rem;">Đã duyệt</span>' 
                : (item.TrangThaiDot === 'Tạm ngưng' 
                    ? '<span class="badge bg-danger-subtle text-danger border border-danger-subtle px-1 py-0" style="font-size:0.7rem;">Tạm ngưng</span>'
                    : (item.TrangThaiDuyet === 'Kết thúc' 
                        ? '<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-1 py-0" style="font-size:0.7rem;">Kết thúc</span>'
                        : '<span class="badge bg-warning-subtle text-warning border border-warning-subtle px-1 py-0" style="font-size:0.7rem;">Chưa duyệt</span>'));

            const miniCard = document.createElement("div");
            miniCard.className = "timetable-mini-card p-2 mb-2 rounded-3 bg-white border shadow-2xs text-start";
            miniCard.setAttribute("data-id", item.TaoDotLaoDong_id);
            miniCard.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <strong class="text-dark small"><i class="fas fa-layer-group text-primary me-1"></i>${item.DotLaoDong || 'Đợt'}</strong>
                    ${badgeStatus}
                </div>
                <div class="small text-secondary mb-1">
                    <i class="fas fa-map-marker-alt text-danger me-1"></i><strong class="text-primary">${item.KhuVuc || ''}</strong> • ${item.LoaiLaoDong || 'Cá nhân'}
                </div>
                <div class="d-flex justify-content-between align-items-center">
                    <span class="small text-muted"><i class="fas fa-user-check me-1"></i>${soLuongDangKy}/${quyDinh}</span>
                    <button class="btn btn-sm btn-link p-0 text-primary btn-detail-dot" data-id="${item.TaoDotLaoDong_id}" data-loai="${item.LoaiLaoDong || ''}" title="Xem chi tiết">
                        Chi tiết &rarr;
                    </button>
                </div>
            `;
            cell.appendChild(miniCard);
        });
    }

    // ==============================
    // CHẾ ĐỘ XEM: CATALOG / TIMETABLE / TABLE
    // ==============================
    window.setViewMode = function(mode) {
        const catalogContainer = document.getElementById("dotCatalogContainer");
        const timetableContainer = document.getElementById("dotTimetableContainer");
        const tableContainer = document.getElementById("dotTableContainer");
        const paginationContainer = document.getElementById("paginationContainerGroup");

        document.querySelectorAll(".btn-mode-tab").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.mode === mode);
        });

        if (mode === "catalog") {
            if (catalogContainer) catalogContainer.style.display = "flex";
            if (timetableContainer) timetableContainer.style.display = "none";
            if (tableContainer) tableContainer.style.display = "none";
            if (paginationContainer) paginationContainer.style.display = "flex";
        } else if (mode === "timetable") {
            if (catalogContainer) catalogContainer.style.display = "none";
            if (timetableContainer) timetableContainer.style.display = "block";
            if (tableContainer) tableContainer.style.display = "none";
            if (paginationContainer) paginationContainer.style.display = "none";
            renderWeeklyTimetable(currentLoadedItems, currentWeekOffset);
        } else { // table
            if (catalogContainer) catalogContainer.style.display = "none";
            if (timetableContainer) timetableContainer.style.display = "none";
            if (tableContainer) tableContainer.style.display = "block";
            if (paginationContainer) paginationContainer.style.display = "flex";
        }

        localStorage.setItem("adminWordRegisterViewMode", mode);
    };

    // Gắn sự kiện chuyển chế độ xem
    document.querySelectorAll(".btn-mode-tab").forEach(btn => {
        btn.addEventListener("click", function () {
            window.setViewMode(this.dataset.mode);
        });
    });

    // Sự kiện điều hướng tuần
    document.getElementById("btnPrevWeek")?.addEventListener("click", function () {
        currentWeekOffset--;
        renderWeeklyTimetable(currentLoadedItems, currentWeekOffset);
    });

    document.getElementById("btnNextWeek")?.addEventListener("click", function () {
        currentWeekOffset++;
        renderWeeklyTimetable(currentLoadedItems, currentWeekOffset);
    });

    document.getElementById("btnCurrentWeek")?.addEventListener("click", function () {
        currentWeekOffset = 0;
        renderWeeklyTimetable(currentLoadedItems, currentWeekOffset);
    });

    // Sự kiện chọn tất cả ở Header Catalog
    document.getElementById("checkAllDotGlobal")?.addEventListener("change", function () {
        const isChecked = this.checked;
        document.querySelectorAll(".check-item-dot, #checkAllDot").forEach(cb => {
            cb.checked = isChecked;
            const card = cb.closest(".schedule-catalog-card");
            if (card) card.classList.toggle("card-selected", isChecked);
        });
        if (typeof updateBulkDeleteButtonState === "function") updateBulkDeleteButtonState();
    });

    // Sự kiện khi click checkbox từng đợt
    document.addEventListener("change", function (e) {
        if (e.target && e.target.classList.contains("check-item-dot")) {
            const id = e.target.value;
            const isChecked = e.target.checked;
            document.querySelectorAll(`.check-item-dot[value="${id}"]`).forEach(cb => {
                cb.checked = isChecked;
            });
            const card = e.target.closest(".schedule-catalog-card");
            if (card) card.classList.toggle("card-selected", isChecked);
            if (typeof updateBulkDeleteButtonState === "function") updateBulkDeleteButtonState();
        }
    });

    // ==============================
    // RENDER CHÍNH (ĐỒNG THỜI CATALOG & BẢNG)
    // ==============================
    function renderDataToTable(items, page) {
        // 1. Render Catalog Cards
        renderDataToCatalog(items, page);

        // 2. Cập nhật số lượng đợt hiển thị
        const displayCount = items.length;
        const countBadge = document.getElementById("dotDisplayCount");
        const totalVisBadge = document.getElementById("totalVisibleDotCount");
        if (countBadge) countBadge.textContent = displayCount;
        if (totalVisBadge) totalVisBadge.textContent = displayCount;

        // 3. Render Bảng truyền thống
        const tbody = document.getElementById("dotLaoDongTableBody");
        if (tbody) {
            tbody.innerHTML = items.map((item, index) => {
                let buoiText = item.Buoi || '';
                if (buoiText === "Sáng") buoiText = "Sáng (7h-8h30)";
                if (buoiText === "Chiều") buoiText = "Chiều (13h-14h)";

                const isLoaiLop = item.LoaiLaoDong === "Lớp";
                const soLopDaDangKy = item.SoLuongLopDaDangKy || 0;
                const tongLopCan = item.SoLuongLop || item.TongSoLopCan || 1;
                const mauLop = soLopDaDangKy >= tongLopCan ? "text-success" : "text-danger";
                const svMoiLop = item.SoLuongSinhVien || 20;

                return `
                <tr
                  data-id="${item.TaoDotLaoDong_id}"
                  data-mota="${(item.MoTa || '').replace(/"/g, '&quot;').replace(/\n/g, ' ')}"
                  data-nguoitao="${String(item.NguoiTao || '').replace(/"/g, '&quot;')}"
                  data-loai="${item.LoaiLaoDong || ''}"
                  data-soluonglop="${item.SoLuongLop || 1}"
                  data-soluongsv="${item.SoLuongSinhVien || 20}"
                >
                    <td class="text-center"><input type="checkbox" class="form-check-input check-item-dot" value="${item.TaoDotLaoDong_id}"></td>
                    <td>${(page - 1) * pageSize + index + 1}</td>
                    <td>${item.DotLaoDong || ''}</td>
                    <td>${buoiText}</td>
                    <td>${item.LoaiLaoDong || ''}</td>
                    <td class="text-success fw-bold">${item.GiaTri ?? ''}</td>
                    <td>${item.NgayLaoDong || ''}</td>
                    <td>${item.KhuVuc || ''}</td>
                    <td class="text-center">
                        <div class="btn-open-sv-thamgia p-1 rounded-2"
                             data-id="${item.TaoDotLaoDong_id}"
                             data-loai="${item.LoaiLaoDong || ''}"
                             style="cursor: pointer;"
                             title="Bấm để xem danh sách sinh viên đăng ký tham gia">
                            ${isLoaiLop ? `
                                <div class="d-flex flex-column align-items-center justify-content-center">
                                    <div class="d-flex align-items-center gap-1">
                                        <i class="fas fa-school text-primary"></i>
                                        <span class="${mauLop} fw-bold">
                                            ${soLopDaDangKy}/${tongLopCan} Lớp
                                        </span>
                                        <i class="fas fa-external-link-alt text-muted ms-1" style="font-size: 0.65rem;"></i>
                                    </div>
                                    <small class="text-muted" style="font-size: 0.72rem;">(Tối đa ${svMoiLop} SV/lớp)</small>
                                </div>
                            ` : `
                                <div class="d-flex align-items-center justify-content-center gap-1">
                                    <i class="fas fa-users text-info"></i>
                                    <span class="${item.SoLuongDangKy < item.SoLuongSinhVien ? 'text-danger' : 'text-success'} fw-bold">
                                        ${item.SoLuongDangKy}/${item.SoLuongSinhVien} SV
                                    </span>
                                    <i class="fas fa-external-link-alt text-muted ms-1" style="font-size: 0.65rem;"></i>
                                </div>
                            `}
                        </div>
                    </td>
                    <td>
                        ${(item.TrangThaiDot === 'Tạm ngưng' || item.TrangThaiDuyet === 'Tạm ngưng') ? `
                            <span class="badge bg-danger" title="${item.MoTa ? 'Lý do: ' + item.MoTa : 'Tạm ngưng'}">Tạm ngưng</span>
                        ` : `
                            <span class="badge ${item.TrangThaiDuyet === 'Đã duyệt' ? 'bg-success' : (item.TrangThaiDuyet === 'Kết thúc' ? 'bg-secondary' : 'bg-warning text-dark')}">
                                ${item.TrangThaiDuyet}
                            </span>
                        `}
                    </td>
                    <td class="action-cell">
                        <div class="d-flex justify-content-center align-items-center gap-1 flex-nowrap w-100">
                            ${(item.TrangThaiDot === 'Tạm ngưng' || item.TrangThaiDuyet === 'Tạm ngưng') ? `
                                <button class="btn btn-sm btn-warning text-dark btn-toggle-tamngung fw-semibold px-2"
                                        data-id="${item.TaoDotLaoDong_id}"
                                        data-dotname="${item.DotLaoDong || ''}"
                                        data-status="Tạm ngưng"
                                        title="Mở lại đợt lao động">
                                    <i class="fas fa-play me-1"></i>Mở lại
                                </button>
                                <button class="btn btn-sm btn-info btn-detail-dot text-white"
                                        data-id="${item.TaoDotLaoDong_id}"
                                        data-loai="${item.LoaiLaoDong || ''}"
                                        title="Xem chi tiết đợt">
                                    <i class="fas fa-info-circle"></i>
                                </button>
                                ${(!window.isManager) ? `
                                <button class="btn btn-sm btn-danger btn-delete"
                                        data-id="${item.TaoDotLaoDong_id}"
                                        title="Xóa đợt">
                                    <i class="fas fa-trash"></i>
                                </button>` : ''}
                            ` : (item.DaDuyet || item.TrangThaiDuyet === 'Đã duyệt') ? `
                                <!-- ĐÃ DUYỆT -->
                                <button class="btn btn-sm btn-primary btn-show-code"
                                        data-id="${item.TaoDotLaoDong_id}"
                                        data-daduyet="1"
                                        title="Hiển thị mã điểm danh">
                                    <i class="fas fa-key"></i>
                                </button>
                                <button class="btn btn-sm btn-success btn-view-attendance"
                                        data-id="${item.TaoDotLaoDong_id}"
                                        data-daduyet="1"
                                        title="Giám sát danh sách điểm danh">
                                    <i class="fas fa-list-check"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-primary btn-view-participants"
                                        data-id="${item.TaoDotLaoDong_id}"
                                        data-loai="${item.LoaiLaoDong || ''}"
                                        title="Xem danh sách sinh viên tham gia">
                                    <i class="fas fa-users"></i>
                                </button>
                                <button class="btn btn-sm btn-info btn-detail-dot text-white"
                                        data-id="${item.TaoDotLaoDong_id}"
                                        data-loai="${item.LoaiLaoDong || ''}"
                                        title="Xem chi tiết đợt">
                                    <i class="fas fa-info-circle"></i>
                                </button>
                                ${(item.TrangThaiDot !== 'Kết thúc' && item.TrangThaiDuyet !== 'Kết thúc') ? `
                                <button class="btn btn-sm btn-warning text-dark btn-toggle-tamngung"
                                        data-id="${item.TaoDotLaoDong_id}"
                                        data-dotname="${item.DotLaoDong || ''}"
                                        data-status="Hoạt động"
                                        title="Tạm ngưng đợt lao động">
                                    <i class="fas fa-pause"></i>
                                </button>` : ''}
                            ` : `
                                <!-- CHƯA DUYỆT: NÚT DUYỆT ĐỢT (Nổi bật nhất, đặt đầu tiên) -->
                                <button class="btn btn-sm btn-success btn-approve px-2 py-1 fw-semibold shadow-sm"
                                        data-id="${item.TaoDotLaoDong_id}"
                                        title="Duyệt đợt lao động">
                                    <i class="fas fa-check me-1"></i>Duyệt
                                </button>
                                <button class="btn btn-sm btn-warning btn-edit"
                                        data-id="${item.TaoDotLaoDong_id}"
                                        title="Chỉnh sửa đợt">
                                    <i class="fas fa-edit"></i>
                                </button>
                                ${(!window.isManager) ? `
                                <button class="btn btn-sm btn-danger btn-delete"
                                        data-id="${item.TaoDotLaoDong_id}"
                                        title="Xóa đợt">
                                    <i class="fas fa-trash"></i>
                                </button>` : ''}
                                <button class="btn btn-sm btn-info btn-detail-dot text-white"
                                        data-id="${item.TaoDotLaoDong_id}"
                                        data-loai="${item.LoaiLaoDong || ''}"
                                        title="Xem chi tiết đợt">
                                    <i class="fas fa-info-circle"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-primary btn-view-participants"
                                        data-id="${item.TaoDotLaoDong_id}"
                                        data-loai="${item.LoaiLaoDong || ''}"
                                        title="Xem danh sách sinh viên tham gia">
                                    <i class="fas fa-users"></i>
                                </button>
                            `}
                        </div>
                    </td>
                </tr>
            `;
            }).join("");

            setTimeout(() => {
                tbody.classList.remove("fade-out");
                tbody.classList.add("fade-in");
            }, 50);
        }

        // 4. Nếu đang ở chế độ xem Thời Khóa Biểu Tuần thì cập nhật ma trận
        const activeMode = localStorage.getItem("adminWordRegisterViewMode") || "catalog";
        if (activeMode === "timetable") {
            renderWeeklyTimetable(items, currentWeekOffset);
        }

        // 5. Khôi phục chế độ xem giao diện
        if (typeof window.setViewMode === "function") {
            window.setViewMode(activeMode);
        }
    }


    // ==============================
    // 4) Phân trang
    // ==============================
    function renderPagination(page, totalPages) {
        const container = document.getElementById("pageNumbers");
        const prevBtn = document.getElementById("prev");
        const nextBtn = document.getElementById("next");

        container.innerHTML = "";

        if (totalPages <= 1) {
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            return;
        }

        prevBtn.disabled = page <= 1;
        prevBtn.onclick = () => gotoPage(page - 1);

        const maxButtons = 7;
        let start = Math.max(1, page - Math.floor(maxButtons / 2));
        let end = Math.min(totalPages, start + maxButtons - 1);
        if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);

        if (start > 1) {
            addPageButton(1);
            if (start > 2) addEllipsis();
        }
        for (let i = start; i <= end; i++) addPageButton(i);
        if (end < totalPages) {
            if (end < totalPages - 1) addEllipsis();
            addPageButton(totalPages);
        }

        nextBtn.disabled = page >= totalPages;
        nextBtn.onclick = () => gotoPage(page + 1);

        function addPageButton(p) {
            const btn = document.createElement("button");
            btn.className = "page-btn";
            btn.textContent = p;
            if (p === page) btn.classList.add("active");
            btn.onclick = () => gotoPage(p);
            container.appendChild(btn);
        }
        function addEllipsis() {
            const span = document.createElement("span");
            span.className = "page-ellipsis";
            span.textContent = "...";
            container.appendChild(span);
        }
        function gotoPage(p) {
            const keyword = document.getElementById("searchBox")?.value || "";

            const buoi = document.getElementById("sessionFilter")?.value || "";
            const trangThai = document.getElementById("statusFilter")?.value || "";
            currentPage = p;
            loadDataToTable(p, keyword, buoi, trangThai);
        }
    }

    // ==============================
    // 5) Mở modal: Tạo mới, Đã xóa
    // ==============================
    document.getElementById("btnAdd")?.addEventListener("click", function () {
        const form = document.getElementById("createForm");
        if (form) form.reset();
        
        const createKhuVuc = document.getElementById("createKhuVuc");
        const createImg = document.getElementById("createKhuVucImage");
        if (createKhuVuc && createImg) {
            createKhuVuc.value = "A1";
            setAreaImage(createImg, "A1");
            const lbl = document.getElementById("createKhuVucLabel");
            if (lbl) lbl.textContent = "Tòa A1";
        }
        new bootstrap.Modal(document.getElementById("createModal")).show();
    });

    // Replace btnViewDeleted fetch handler with this improved version
    document.getElementById("btnViewDeleted")?.addEventListener("click", function () {
        const body = document.getElementById("deletedTableBody");
        const countBadge = document.getElementById("deletedCountBadge");
        if (countBadge) countBadge.textContent = "...";

        body.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5">
                    <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                    <span class="text-muted">Đang tải dữ liệu...</span>
                </td>
            </tr>`;

        fetch("/Admin/AdminWordRegister/GetDeletedDotLaoDong", { credentials: 'same-origin' })
            .then(res => {
                console.log("GetDeletedDotLaoDong status:", res.status, res.statusText);
                const ct = res.headers.get('content-type') || '';
                if (!res.ok) {
                    return res.text().then(text => { throw new Error(`HTTP ${res.status}: ${text}`); });
                }
                if (!ct.includes('application/json')) {
                    return res.text().then(text => { throw new Error('Expected JSON but got: ' + text); });
                }
                return res.json();
            })
            .then(data => {
                if (!data.items || data.items.length === 0) {
                    if (countBadge) countBadge.textContent = "0 đợt";
                    body.innerHTML = `
                        <tr>
                            <td colspan="7">
                                <div class="deleted-empty-state">
                                    <div class="deleted-empty-icon"><i class="fas fa-trash-alt"></i></div>
                                    <div class="deleted-empty-text">Thùng rác trống</div>
                                    <div class="deleted-empty-subtext">Không có đợt lao động nào bị xóa hoặc hủy</div>
                                </div>
                            </td>
                        </tr>`;
                } else {
                    if (countBadge) countBadge.textContent = `${data.items.length} đợt`;
                    const rows = data.items.map((x, i) => {
                        const isMorning = x.Buoi === "Sáng";
                        const isAfternoon = x.Buoi === "Chiều";
                        const buoiTag = isMorning
                            ? `<span class="session-tag morning"><i class="fas fa-sun text-warning"></i> Sáng (7h-8h30)</span>`
                            : isAfternoon
                            ? `<span class="session-tag afternoon"><i class="fas fa-cloud-sun text-warning"></i> Chiều (13h-14h)</span>`
                            : `<span class="badge bg-light text-dark">${x.Buoi || "--"}</span>`;

                        return `
                        <tr>
                            <td class="col-stt">${i + 1}</td>
                            <td class="col-name">${x.DotLaoDong || "Chưa có tên"}</td>
                            <td class="col-session">${buoiTag}</td>
                            <td class="col-date">
                                <span class="date-tag"><i class="far fa-calendar-alt text-primary"></i> ${x.NgayLaoDong || "--"}</span>
                            </td>
                            <td class="col-area">
                                <span class="area-badge"><i class="fas fa-map-marker-alt text-danger"></i> ${x.KhuVuc || "--"}</span>
                            </td>
                            <td class="col-deleted-date">
                                <span class="deleted-date-tag"><i class="far fa-clock"></i> ${x.Ngayxoa || "--"}</span>
                            </td>
                            <td class="col-actions">
                                <div class="action-btn-group">
                                    <button type="button" class="btn-restore-action btn-restore" data-id="${x.TaoDotLaoDong_id}" title="Khôi phục lại đợt này">
                                        <i class="fas fa-undo-alt"></i> Khôi phục
                                    </button>
                                    <button type="button" class="btn-perm-delete-action btn-permanent-delete" data-id="${x.TaoDotLaoDong_id}" title="Xóa vĩnh viễn khỏi hệ thống">
                                        <i class="fas fa-trash-alt"></i> Xóa vĩnh viễn
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                    }).join("");

                    body.innerHTML = rows;
                }
                new bootstrap.Modal(document.getElementById("deletedModal")).show();
            })
            .catch(err => {
                console.error("Load deleted items failed:", err);
                if (countBadge) countBadge.textContent = "Lỗi";
                body.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4"><i class="fas fa-exclamation-triangle me-2"></i>Lỗi tải dữ liệu đợt đã xóa</td></tr>`;
                new bootstrap.Modal(document.getElementById("deletedModal")).show();
            });
    });


    // ==============================
    // 6) Event delegation cho nút trong bảng
    // ==============================
    document.addEventListener("click", function (e) {
        const editBtn = e.target.closest(".btn-edit");
        const deleteBtn = e.target.closest(".btn-delete");
        const approveBtn = e.target.closest(".btn-approve");
        const restoreBtn = e.target.closest(".btn-restore");
        const permanentDeleteBtn = e.target.closest(".btn-permanent-delete");
        const tamNgungBtn = e.target.closest(".btn-toggle-tamngung");

        // Xử lý nút Tạm ngưng / Mở lại đợt lao động
        if (tamNgungBtn) {
            const id = tamNgungBtn.dataset.id;
            const currentStatus = tamNgungBtn.dataset.status;
            const dotName = tamNgungBtn.dataset.dotname || "";
            const isTamNgung = currentStatus === "Tạm ngưng";

            const modalEl = document.getElementById("modalTamDungDot");
            if (!modalEl) {
                console.warn("Không tìm thấy modalTamDungDot");
                return;
            }

            document.getElementById("tamDungDotId").value = id;
            document.getElementById("tamDungTenDot").textContent = dotName ? `${dotName} (ID: ${id})` : `ID: ${id}`;

            const reasonGroup = document.getElementById("tamDungReasonGroup");
            const resumeGroup = document.getElementById("tamDungResumeGroup");
            const modalTitle = document.getElementById("modalTamDungTitle");
            const confirmBtnText = document.getElementById("btnConfirmTamDungText");
            const lyDoInput = document.getElementById("tamDungLyDo");

            if (isTamNgung) {
                document.getElementById("tamDungActionType").value = "resume";
                if (modalTitle) modalTitle.textContent = "Mở lại đợt lao động";
                if (reasonGroup) reasonGroup.style.display = "none";
                if (resumeGroup) resumeGroup.style.display = "block";
                if (confirmBtnText) confirmBtnText.textContent = "Mở lại đợt";
            } else {
                document.getElementById("tamDungActionType").value = "pause";
                if (modalTitle) modalTitle.textContent = "Tạm ngưng đợt lao động";
                if (reasonGroup) reasonGroup.style.display = "block";
                if (resumeGroup) resumeGroup.style.display = "none";
                if (lyDoInput) {
                    lyDoInput.value = "";
                    setTimeout(() => lyDoInput.focus(), 500);
                }
                if (confirmBtnText) confirmBtnText.textContent = "Xác nhận tạm ngưng";
            }

            const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
            modalInstance.show();
            return;
        }

        // Xem chi tiết sinh viên tham gia (nút "Xem" hoặc nút "DS tham gia" hoặc click vào cột Sĩ số)
        const btnXemChiTiet = e.target.closest("#btnXemChiTietSinhVien, .btn-view-sinhvien, .btn-view-participants, .btn-open-sv-thamgia");
        if (btnXemChiTiet) {
            const id = btnXemChiTiet.dataset.id || btnXemChiTiet.getAttribute("data-id");
            const loai = (btnXemChiTiet.dataset.loai || "").trim();

            if (loai === "Lớp" && typeof moModalLopDaDangKy === "function") {
                moModalLopDaDangKy(id);
                return;
            }

            const tbody = document.getElementById("sinhVienTableBody");
            const modalEl = document.getElementById("sinhVienModal");
            const subEl = document.getElementById("sinhVienModalSub");
            const countEl = document.getElementById("sinhVienModalCount");
            const paginEl = document.getElementById("sinhVienPagination");
            const pageSize = 10;
            let currentPage = 1;
            let fullData = [];

            if (!tbody || !modalEl) {
                console.warn("Không tìm thấy bảng hoặc modal sinh viên");
                return;
            }

            const esc = (value) => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
            const formatMSSV = (value) => {
                let code = String(value ?? "").trim();
                if (code.length === 9 && !code.startsWith("0")) code = "0" + code;
                return code;
            };

            if (subEl) subEl.textContent = "Đang tải danh sách sinh viên...";
            if (countEl) countEl.textContent = "";
            if (paginEl) paginEl.innerHTML = "";
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Đang tải danh sách...</td></tr>`;
            bootstrap.Modal.getOrCreateInstance(modalEl).show();

            fetch(`/Admin/AdminWordRegister/GetSinhVienThamGia?maDot=${encodeURIComponent(id)}`)
                .then(res => res.json())
                .then(data => {
                    if (!data.success || !Array.isArray(data.data) || data.data.length === 0) {
                        if (subEl) subEl.textContent = "Đợt lao động này chưa có sinh viên đăng ký.";
                        if (countEl) countEl.textContent = "0 sinh viên";
                        tbody.innerHTML = `
                            <tr>
                                <td colspan="5" class="py-0">
                                    <div class="admin-modal-empty is-inline">
                                        <span class="admin-modal-empty-icon"><i class="fas fa-user-slash"></i></span>
                                        <strong>Chưa có sinh viên tham gia</strong>
                                        <span>Sinh viên đăng ký đợt lao động sẽ xuất hiện tại đây.</span>
                                    </div>
                                </td>
                            </tr>`;
                        return;
                    }

                    fullData = data.data;
                    if (subEl) subEl.textContent = `Có ${fullData.length} sinh viên đã đăng ký tham gia đợt lao động này.`;
                    if (countEl) countEl.textContent = `Tổng cộng ${fullData.length} sinh viên`;

                    function renderPage(page) {
                        currentPage = page;
                        const start = (page - 1) * pageSize;
                        const pageData = fullData.slice(start, start + pageSize);

                        tbody.innerHTML = pageData.map((sv, i) => `
                            <tr>
                                <td class="col-index">${start + i + 1}</td>
                                <td class="col-code">${formatMSSV(sv.MSSV)}</td>
                                <td class="cell-name">${esc(sv.TenSinhVien || sv.HoTen || "")}</td>
                                <td>${esc(sv.TenLop || "")}</td>
                                <td>${esc(sv.TenKhoa || "")}</td>
                            </tr>
                        `).join("");

                        renderPagination();
                    }

                    function renderPagination() {
                        if (!paginEl) return;
                        const totalPages = Math.max(1, Math.ceil(fullData.length / pageSize));
                        paginEl.innerHTML = "";
                        if (totalPages <= 1) return;

                        const addBtn = (label, targetPage, disabled, active, ariaLabel) => {
                            const btn = document.createElement("button");
                            btn.type = "button";
                            btn.className = "admin-page-btn" + (active ? " is-active" : "");
                            btn.textContent = label;
                            btn.disabled = !!disabled;
                            if (ariaLabel) btn.setAttribute("aria-label", ariaLabel);
                            btn.addEventListener("click", () => {
                                if (!disabled && targetPage !== currentPage) renderPage(targetPage);
                            });
                            paginEl.appendChild(btn);
                        };

                        addBtn("‹", currentPage - 1, currentPage <= 1, false, "Trang trước");
                        for (let i = 1; i <= totalPages; i++) {
                            addBtn(String(i), i, false, i === currentPage, `Trang ${i}`);
                        }
                        addBtn("›", currentPage + 1, currentPage >= totalPages, false, "Trang sau");
                    }

                    renderPage(1);
                })
                .catch(err => {
                    console.error("Lỗi tải danh sách sinh viên:", err);
                    if (subEl) subEl.textContent = "Không thể tải danh sách sinh viên.";
                    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Lỗi tải dữ liệu. Vui lòng thử lại.</td></tr>`;
                });

            return;
        }

        // XỬ LÝ NÚT CHI TIẾT ĐỢT (HOÀN CHỈNH THEO YÊU CẦU MỚI)
        const detailBtn = e.target.closest(".btn-detail-dot") || e.target.closest(".btn-detail");
        if (detailBtn) {
            const dotId = detailBtn.dataset.id;
            const loaiLaoDong = detailBtn.dataset.loai || "";

            if (loaiLaoDong === "Lớp") {
                // Nếu là loại "Lớp" → mở modal danh sách lớp đã đăng ký
                moModalLopDaDangKy(dotId);
            } else {
                // Nếu là loại cá nhân → mở modal chi tiết đợt như cũ
                const tr = detailBtn.closest("tr") || document.querySelector(`tr[data-id="${dotId}"]`);
                if (!tr) return;

                const cells = tr.querySelectorAll("td");

                const setText = (id, value) => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = value || "";
                };

                setText("detailDotLaoDong", (tr.querySelector(".Dotloaodong")?.textContent || cells[2]?.textContent || "").trim());
                setText("detailBuoi", cells[3]?.textContent?.trim());
                setText("detailLoaiLaoDong", cells[4]?.textContent?.trim());
                setText("detailGiaTri", cells[5]?.textContent?.trim());
                setText("detailNgayLaoDong", cells[6]?.textContent?.trim());
                setText("detailKhuVuc", cells[7]?.textContent?.trim());

                const soLuongRaw = cells[8]?.textContent?.trim() || "";
                let soDangKy = "0", soQuyDinh = "";
                if (soLuongRaw.includes("/")) {
                    [soDangKy, soQuyDinh] = soLuongRaw.split("/").map(x => x.trim());
                }

                const soLuongEl = document.getElementById("detailSoLuongSinhVien");
                if (soLuongEl) {
                    soLuongEl.innerHTML = `
                        <span class="fw-bold">${soDangKy}${soQuyDinh ? "/" + soQuyDinh : ""}</span>
                        <button class="btn btn-sm btn-outline-primary ms-2 btn-view-sinhvien" data-id="${dotId}">
                            <i class="fas fa-users me-1"></i> Xem
                        </button>
                    `;
                }

                setText("detailTrangThaiDuyet", tr.querySelector(".badge")?.textContent?.trim());
                setText("detailMoTa", tr.dataset.mota || "");
                setText("detailNguoiTao", tr.dataset.nguoitao || "");

                const khuVucValue = (cells[7]?.textContent?.trim() || "").replace(/^Tòa\s+/i, "");
                const imgEl = document.getElementById("detailKhuVucImage");
                if (imgEl) setAreaImage(imgEl, khuVucValue);
                const detailBadge = document.getElementById("detailKhuVucBadge");
                if (detailBadge) detailBadge.textContent = cells[7]?.textContent?.trim() || "Khu vực lao động";

                new bootstrap.Modal(document.getElementById("detailModal")).show();
            }
            return;
        }

        // sửa
        if (editBtn) {
            const tr = editBtn.closest("tr") || document.querySelector(`tr[data-id="${editBtn.dataset.id}"]`);
            if (!tr) return;
            const isApproved = tr.querySelector(".badge")?.textContent === "Đã duyệt";
            if (isApproved) {
                showToast("Đợt đã duyệt không thể chỉnh sửa!", "warning");
                return;
            }

            const cells = tr.querySelectorAll("td");

            const setInputValue = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.value = value || "";
            };

            setInputValue("editId", editBtn.dataset.id);
            const dotText = (tr.querySelector(".Dotloaodong")?.textContent || cells[2]?.textContent || "").trim();
            const editMonthSelectEl = document.getElementById("editDotLaoDong");
            const editDaySelectEl = document.getElementById("editNgayLaoDong");

            if (editMonthSelectEl) {
                editMonthSelectEl.value = [...editMonthSelectEl.options].some(opt => opt.value === dotText) ? dotText : "";

                // Tự động sinh danh sách ngày theo tháng
                if (editMonthSelectEl.value && editDaySelectEl) {
                    const monthLabel = editMonthSelectEl.value;
                    const currentYear = new Date().getFullYear();
                    const monthNumber = parseInt(monthLabel.replace("Tháng ", "")) || 1;
                    const daysInMonth = new Date(currentYear, monthNumber, 0).getDate();

                    editDaySelectEl.innerHTML = '<option value="">-- Chọn ngày --</option>';
                    for (let d = 1; d <= daysInMonth; d++) {
                        const dayStr = String(d).padStart(2, "0");
                        const monthStr = String(monthNumber).padStart(2, "0");
                        const value = `${currentYear}-${monthStr}-${dayStr}`;
                        const label = `${dayStr}/${monthStr}/${currentYear}`;
                        const option = document.createElement("option");
                        option.value = value;
                        option.textContent = label;
                        editDaySelectEl.appendChild(option);
                    }
                }
            }

            // Buổi
            let buoiRaw = cells[3]?.textContent || "";
            let buoiValue = buoiRaw.includes("Sáng") ? "Sáng" : buoiRaw.includes("Chiều") ? "Chiều" : "";
            setInputValue("editBuoi", buoiValue);

            // Loại lao động
            const loaiTextRaw = tr.dataset.loai || cells[4]?.textContent || "";
            const loaiText = loaiTextRaw.toLowerCase().trim();
            const loaiSelect = document.getElementById("editLoaiLaoDong");

            const isLop = loaiText.includes("lớp");
            if (loaiSelect) {
                if (loaiText.includes("cá")) {
                    loaiSelect.value = "Cá nhân";
                } else if (isLop) {
                    loaiSelect.value = "Lớp";
                } else {
                    loaiSelect.value = "";
                }
            }

            // Cập nhật ẩn/hiện group lớp và đổi label
            const editLopGroup = document.getElementById("editSoLuongLopGroup");
            const editSVLabel = document.getElementById("editSoLuongSVLabel");
            if (editLopGroup) editLopGroup.style.display = isLop ? "block" : "none";
            if (editSVLabel) {
                editSVLabel.innerHTML = isLop 
                    ? '<i class="fas fa-user-check text-primary me-1"></i> Giới hạn SV mỗi lớp'
                    : '<i class="fas fa-users text-primary me-1"></i> Số lượng SV';
            }

            // Giá trị
            setInputValue("editGiaTri", (cells[5]?.textContent || "").trim().replace(/[^\d.]/g, ""));

            // Ngày lao động
            const ngayText = cells[6]?.textContent?.trim(); // dd/MM/yyyy
            if (editDaySelectEl && ngayText) {
                const parts = ngayText.split("/");
                if (parts.length === 3) {
                    const value = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    let found = false;
                    for (let opt of editDaySelectEl.options) {
                        if (opt.value === value || opt.textContent.trim() === ngayText) {
                            opt.selected = true;
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        const opt = document.createElement("option");
                        opt.value = value;
                        opt.textContent = ngayText;
                        opt.selected = true;
                        editDaySelectEl.appendChild(opt);
                    }
                }
            }

            // Khu vực
            const khuVucRaw = (cells[7]?.textContent?.trim() || "").replace(/^Tòa\s+/i, "");
            const khuVucSelect = document.getElementById("editKhuVuc");
            if (khuVucSelect) {
                for (let opt of khuVucSelect.options) {
                    if (opt.value === khuVucRaw || opt.value === `Tòa ${khuVucRaw}` || opt.textContent.includes(khuVucRaw)) {
                        khuVucSelect.value = opt.value;
                        break;
                    }
                }
                setAreaImage(document.getElementById("editKhuVucImage"), khuVucSelect.value);
                const editLbl = document.getElementById("editKhuVucLabel");
                if (editLbl) editLbl.textContent = khuVucSelect.options[khuVucSelect.selectedIndex]?.text || khuVucSelect.value;
            }

            // Số lượng lớp
            const soLuongLop = parseInt(tr.dataset.soluonglop) || 1;
            setInputValue("editSoLuongLop", soLuongLop);

            // Số lượng sinh viên / Giới hạn SV mỗi lớp
            const soLuongSV = parseInt(tr.dataset.soluongsv) || 20;
            setInputValue("editSoLuongSinhVien", soLuongSV);

            // Mô tả
            setInputValue("editMoTa", tr.dataset.mota || "");

            // Mở modal
            const editModalEl = document.getElementById("editModal");
            if (editModalEl) new bootstrap.Modal(editModalEl).show();
            return;
        }

        // xóa mềm
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            const tr = deleteBtn.closest("tr") || document.querySelector(`tr[data-id="${id}"]`);
            if (!tr) return;
            const tenDot = tr.querySelector(".Dotloaodong")?.textContent?.trim() || tr.querySelector("td:nth-child(3)")?.textContent?.trim() || "";

            const isApproved = tr.querySelector(".badge")?.textContent === "Đã duyệt";
            if (isApproved) {
                showToast("Đợt đã duyệt không thể xóa!", "warning");
                return;
            }

            closeModalIfOpen("deletedModal");
            closeModalIfOpen("editModal");
            closeModalIfOpen("detailModal");

            const deleteConfirmText = document.getElementById("deleteConfirmText");
            const deleteDotInfo = document.getElementById("deleteDotInfo");
            const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
            if (deleteConfirmText) deleteConfirmText.textContent = "Bạn có chắc chắn muốn xóa đợt này?";
            if (deleteDotInfo) deleteDotInfo.textContent = `Đợt: ${tenDot} (ID: ${id})`;
            if (confirmDeleteBtn) {
                confirmDeleteBtn.dataset.id = id;
                confirmDeleteBtn.dataset.mode = "soft";
            }

            const deleteModalEl = document.getElementById("deleteModal");
            if (deleteModalEl) new bootstrap.Modal(deleteModalEl).show();

            return;
        }

        // xóa vĩnh viễn
        if (permanentDeleteBtn) {
            const id = permanentDeleteBtn.dataset.id;
            const tr = permanentDeleteBtn.closest("tr") || document.querySelector(`tr[data-id="${id}"]`);
            if (!tr) return;
            const tenDot = tr.querySelector(".Dotloaodong")?.textContent?.trim() || tr.querySelector("td:nth-child(3)")?.textContent?.trim() || "";

            const isApproved = tr.querySelector(".badge")?.textContent === "Đã duyệt";
            if (isApproved) {
                showToast("Đợt đã duyệt không thể xóa vĩnh viễn!", "warning");
                return;
            }

            closeModalIfOpen("deletedModal");

            const deleteConfirmText = document.getElementById("deleteConfirmText");
            const deleteDotInfo = document.getElementById("deleteDotInfo");
            const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
            if (deleteConfirmText) deleteConfirmText.textContent = "⚠️ Bạn có chắc chắn muốn xóa vĩnh viễn đợt này?";
            if (deleteDotInfo) deleteDotInfo.textContent = `Đợt: ${tenDot} (ID: ${id})`;
            if (confirmDeleteBtn) {
                confirmDeleteBtn.dataset.id = id;
                confirmDeleteBtn.dataset.mode = "hard";
            }

            const deleteModalEl = document.getElementById("deleteModal");
            if (deleteModalEl) new bootstrap.Modal(deleteModalEl).show();

            return;
        }

        // Duyệt đợt lao động
        if (approveBtn) {
            const id = approveBtn.dataset.id;
            if (!id) return;

            const executeApprove = () => {
                approveBtn.disabled = true;
                fetch(`/Admin/AdminWordRegister/ApproveAjax?id=${encodeURIComponent(id)}`, { method: "POST" })
                    .then(res => res.json())
                    .then(data => {
                        showToast(data.message || (data.success ? "Đã duyệt đợt lao động thành công!" : "Duyệt thất bại"), data.success ? "success" : "error");
                        if (typeof loadDataToTable === "function") {
                            loadDataToTable(currentPage);
                        } else {
                            location.reload();
                        }
                    })
                    .catch(() => {
                        approveBtn.disabled = false;
                        showToast("Lỗi kết nối đến máy chủ!", "error");
                    });
            };

            if (typeof Swal !== "undefined") {
                Swal.fire({
                    title: "Duyệt đợt lao động?",
                    text: "Bạn có chắc chắn muốn duyệt đợt này để mở điểm danh và cấp mã?",
                    icon: "question",
                    showCancelButton: true,
                    confirmButtonColor: "#16a34a",
                    cancelButtonColor: "#64748b",
                    confirmButtonText: '<i class="fas fa-check me-1"></i> Đồng ý duyệt',
                    cancelButtonText: "Hủy"
                }).then((result) => {
                    if (result.isConfirmed) {
                        executeApprove();
                    }
                });
            } else {
                if (confirm("Bạn có chắc chắn muốn duyệt đợt lao động này?")) {
                    executeApprove();
                }
            }
            return;
        }

        // Khôi phục
        if (restoreBtn) {
            const id = restoreBtn.dataset.id;
            const row = restoreBtn.closest("tr");
            if (!id) return;
            restoreBtn.disabled = true;

            fetch(`/Admin/AdminWordRegister/RestoreAjax?id=${encodeURIComponent(id)}`, { method: "POST", credentials: 'same-origin' })
                .then(res => {
                    if (!res.ok) return res.text().then(text => { throw new Error(`HTTP ${res.status}: ${text}`); });
                    const ct = res.headers.get('content-type') || '';
                    if (!ct.includes('application/json')) return res.text().then(text => { throw new Error('Invalid JSON: ' + text); });
                    return res.json();
                })
                .then(data => {
                    showToast(data.message || (data.success ? "Đã khôi phục đợt lao động!" : "Khôi phục thất bại"), data.success ? "success" : "error");
                    if (data.success && row) {
                        row.style.transition = "opacity 0.3s ease, transform 0.3s ease";
                        row.style.opacity = "0";
                        row.style.transform = "scale(0.95)";
                        setTimeout(() => {
                            row.remove();
                            const tbody = document.getElementById("deletedTableBody");
                            const countBadge = document.getElementById("deletedCountBadge");
                            const remainingRows = tbody ? tbody.querySelectorAll("tr").length : 0;
                            if (remainingRows === 0 && tbody) {
                                if (countBadge) countBadge.textContent = "0 đợt";
                                tbody.innerHTML = `
                                    <tr>
                                        <td colspan="7">
                                            <div class="deleted-empty-state">
                                                <div class="deleted-empty-icon"><i class="fas fa-trash-alt"></i></div>
                                                <div class="deleted-empty-text">Thùng rác trống</div>
                                                <div class="deleted-empty-subtext">Không có đợt lao động nào bị xóa hoặc hủy</div>
                                            </div>
                                        </td>
                                    </tr>`;
                            } else if (countBadge) {
                                countBadge.textContent = `${remainingRows} đợt`;
                            }
                        }, 300);
                    }
                    loadDataToTable(currentPage);
                })
                .catch(err => {
                    console.error("Restore failed:", err);
                    showToast("Lỗi khôi phục hoặc kết nối!", "error");
                })
                .finally(() => {
                    restoreBtn.disabled = false;
                });

            return;
        }
    });


    // ==============================
    // Xử lý chuyển đổi loại lao động (Cá Nhân / Lớp) trong Form Tạo & Sửa
    // ==============================
    const createLoaiSelect = document.getElementById("createLoaiLaoDong");
    const createLopGroup = document.getElementById("createSoLuongLopGroup");
    const createSVLabel = document.getElementById("createSoLuongSVLabel");
    const createSVInput = document.getElementById("createSoLuongSinhVien");

    function updateCreateFormLoai() {
        if (!createLoaiSelect) return;
        const isLop = createLoaiSelect.value === "Lớp";
        if (createLopGroup) createLopGroup.style.display = isLop ? "block" : "none";
        if (createSVLabel) {
            createSVLabel.innerHTML = isLop
                ? '<i class="fas fa-user-check text-primary me-1"></i> Giới hạn SV mỗi lớp <span class="text-danger">*</span>'
                : '<i class="fas fa-users text-primary me-1"></i> Số lượng sinh viên <span class="text-danger">*</span>';
        }
        if (createSVInput && isLop && (!createSVInput.value || parseInt(createSVInput.value) <= 0)) {
            createSVInput.value = 20;
        }
    }
    if (createLoaiSelect) {
        createLoaiSelect.addEventListener("change", updateCreateFormLoai);
        updateCreateFormLoai();
    }

    const editLoaiSelect = document.getElementById("editLoaiLaoDong");
    const editLopGroup = document.getElementById("editSoLuongLopGroup");
    const editSVLabel = document.getElementById("editSoLuongSVLabel");

    function updateEditFormLoai() {
        if (!editLoaiSelect) return;
        const isLop = editLoaiSelect.value === "Lớp";
        if (editLopGroup) editLopGroup.style.display = isLop ? "block" : "none";
        if (editSVLabel) {
            editSVLabel.innerHTML = isLop
                ? '<i class="fas fa-user-check text-primary me-1"></i> Giới hạn SV mỗi lớp <span class="text-danger">*</span>'
                : '<i class="fas fa-users text-primary me-1"></i> Số lượng SV <span class="text-danger">*</span>';
        }
    }
    if (editLoaiSelect) {
        editLoaiSelect.addEventListener("change", updateEditFormLoai);
    }

    // ==============================
    // 7) Submit form AJAX: Create, Edit, Delete
    // ==============================


    document.getElementById("editForm")?.addEventListener("submit", function (e) {
        e.preventDefault();
        const formData = new FormData(this);
        fetch(this.action, { method: "POST", body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    bootstrap.Modal.getInstance(document.getElementById("editModal")).hide();
                    showToast(data.message || "Cập nhật thành công!");
                    loadDataToTable(currentPage);
                } else {
                    showToast(data.message || "Cập nhật thất bại!");
                }
            })
            .catch(() => showToast("Lỗi kết nối!"));
    });
    document.getElementById("confirmDeleteBtn")?.addEventListener("click", function () {
        const id = this.dataset.id;
        const mode = this.dataset.mode;
        const url = mode === "hard"
            ? `/Admin/AdminWordRegister/DeleteForever?id=${id}`
            : `/Admin/AdminWordRegister/DeleteAjax?id=${id}`;


        console.log("Xác nhận xóa:", { id, mode, url });

        fetch(url, { method: "POST" })
            .then(res => {
                if (!res.ok) {
                    return res.text().then(text => {
                        console.error("Lỗi server:", text);
                        throw new Error("Server error");
                    });
                }
                return res.json();
            })
            .then(data => {
                console.log("Kết quả trả về:", data);
                closeModalIfOpen("deleteModal");
                showToast(data.message || (data.success ? "Đã xóa" : "Xóa thất bại"), data.success ? "success" : "error");
                loadDataToTable(currentPage);
            })
            .catch(err => {
                console.error("Lỗi kết nối:", err);
                showToast("Lỗi kết nối hoặc server không phản hồi!", "error");
            });

    });





    // ==============================
    // 8) Bộ lọc + tìm kiếm
    // ==============================
    document.getElementById("statusFilter")?.addEventListener("change", triggerReload);
    document.getElementById("sessionFilter")?.addEventListener("change", triggerReload);
    document.getElementById("searchBox")?.addEventListener("input", debounce(triggerReload, 300));

    function triggerReload() {
        const keyword = document.getElementById("searchBox")?.value || "";
        const buoi = document.getElementById("sessionFilter")?.value || "";
        const trangThai = document.getElementById("statusFilter")?.value || "";
        currentPage = 1;
        loadDataToTable(1, keyword, buoi, trangThai);
    }

    function debounce(fn, delay) {
        let t;
        return function (...args) {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // ==============================
    // 9) Tự động sinh ngày khi chọn tháng (Choices.js)
    // ==============================
    const monthSelect = document.getElementById("dotLaoDongMonth");
    const daySelect = document.getElementById("dotLaoDongDay");
    let dayChoices;

    if (daySelect) {
        dayChoices = new Choices(daySelect, {
            shouldSort: false,
            position: 'bottom',
            searchEnabled: false,
            itemSelectText: '',
        });
    }

    if (monthSelect && dayChoices) {
        const currentYear = new Date().getFullYear();

        // ✅ Chọn tháng hiện tại
        const currentMonthNumber = new Date().getMonth() + 1;
        const currentMonthLabel = `Tháng ${currentMonthNumber}`;
        monthSelect.value = currentMonthLabel;
        fillDays(currentMonthLabel);

        monthSelect.addEventListener("change", function () {
            fillDays(this.value);
        });

        function fillDays(monthLabel) {
            if (!monthLabel) {
                dayChoices.clearChoices();
                return;
            }

            const monthNumber = parseInt(monthLabel.replace("Tháng ", ""));
            const daysInMonth = new Date(currentYear, monthNumber, 0).getDate();

            const today = new Date();
            const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

            const choicesArray = [];

            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(currentYear, monthNumber - 1, d);
                if (date >= todayMidnight) {
                    const dayStr = String(d).padStart(2, "0");
                    const monthStr = String(monthNumber).padStart(2, "0");
                    const value = `${currentYear}-${monthStr}-${dayStr}`;
                    const label = `${dayStr}/${monthStr}/${currentYear}`;
                    choicesArray.push({
                        value: value,
                        label: label,
                        selected: choicesArray.length === 0
                    });
                }
            }

            dayChoices.setChoices(choicesArray, 'value', 'label', true);
        }
    }


    // ==============================
    // 11. Xuất Excel TOÀN BỘ dữ liệu (dùng action có sẵn)
    // ==============================
    document.getElementById("exportExcel")?.addEventListener("click", exportDotLaoDong);

    function exportDotLaoDong() {
        fetch('/Admin/AdminWordRegister/ExportAllDotLaoDong')
            .then(r => r.json())
            .then(data => {
                if (!data.success) {
                    showToast("Không có dữ liệu để xuất!", "warning");
                    return;
                }

                // ===== Bảng 1: Đợt Lao Động =====
                let html = `
                <meta charset="UTF-8">
                <style>
                    table {
                        border-collapse: collapse;
                        font-family: 'Times New Roman', Times, serif;
                        font-size: 14px;
                        width: 100%;
                    }
                    th, td {
                        border: 1px solid black;
                        padding: 6px;
                        text-align: center;
                        vertical-align: middle;
                    }
                    h2 {
                        text-align: center;
                        font-weight: bold;
                        margin: 10px 0;
                    }
                </style>
                <h2>BẢNG ĐỢT LAO ĐỘNG</h2>
                <table>
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Tên Đợt</th>
                            <th>Buổi</th>
                            <th>Loại Lao Động</th>
                            <th>Giá Trị</th>
                            <th>Ngày Lao Động</th>
                            <th>Khu Vực</th>
                            <th>Đăng ký/Quy định</th>
                            <th>Trạng Thái</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

                (data.dotList || []).forEach((item, i) => {
                    const soDangKy = item.SoLuongDangKy || 0;
                    const quyDinh = item.SoLuongSinhVien || 0;
                    const boldStyle = item.TrangThaiDuyet === "Đã duyệt" ? "font-weight:bold;" : "";

                    html += `<tr style="${boldStyle}">
                    <td>${i + 1}</td>
                    <td>${item.DotLaoDong}</td>
                    <td>${item.Buoi}</td>
                    <td>${item.LoaiLaoDong}</td>
                    <td>${item.GiaTri}</td>
                    <td>${item.NgayLaoDong}</td>
                    <td>${item.KhuVuc}</td>
                    <td>${soDangKy}/${quyDinh}</td>
                    <td>${item.TrangThaiDuyet}</td>
                </tr>`;
                });

                html += `</tbody></table><br/><br/>`;

                // ===== Bảng 2: Sinh Viên tham gia =====
                html += `
                <h2>BẢNG SINH VIÊN THAM GIA</h2>
                <table>
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>MSSV</th>
                            <th>Họ Tên</th>
                            <th>Lớp</th>
                            <th>Khoa</th>
                            <th>Đợt Lao Động</th>
                            <th>Buổi</th>
                            <th>Ngày Xác Nhận</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

                (data.sinhVienList || []).forEach((sv, i) => {
                    html += `<tr>
                    <td>${i + 1}</td>
                    <td>${sv.MSSV}</td>
                    <td>${sv.HoTen}</td>
                    <td>${sv.Lop}</td>
                    <td>${sv.Khoa}</td>
                    <td>${sv.DotLaoDong}</td>
                    <td>${sv.Buoi}</td>
                    <td>${sv.NgayXacNhan}</td>
                </tr>`;
                });

                html += `</tbody></table>`;

                // Xuất file Excel
                const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `DotLaoDong_SinhVien_${new Date().toISOString().slice(0, 10)}.xls`;
                a.click();
                URL.revokeObjectURL(url);

                showToast("Xuất Excel thành công!", "success");
            })
            .catch(() => showToast("Lỗi tải dữ liệu!", "error"));
    }


    // ==============================
    // Tự động sinh ngày cho form Chỉnh sửa
    // ==============================
    const editMonthSelect = document.getElementById("editDotLaoDong");

    const editDaySelect = document.getElementById("editNgayLaoDong");

    if (editMonthSelect && editDaySelect) {
        editMonthSelect.addEventListener("change", function () {
            const monthLabel = this.value;
            const currentYear = new Date().getFullYear();
            const monthNumber = parseInt(monthLabel.replace("Tháng ", ""));
            const daysInMonth = new Date(currentYear, monthNumber, 0).getDate();

            editDaySelect.innerHTML = '<option value="">-- Chọn ngày --</option>';
            for (let d = 1; d <= daysInMonth; d++) {
                const dayStr = String(d).padStart(2, "0");
                const monthStr = String(monthNumber).padStart(2, "0");
                const value = `${currentYear}-${monthStr}-${dayStr}`;
                const label = `${dayStr}/${monthStr}/${currentYear}`;
                const option = document.createElement("option");
                option.value = value;
                option.textContent = label;
                editDaySelect.appendChild(option);
            }
        });
    }




    // Hàm đóng modal nếu đang mở
    function closeModalIfOpen(modalId) {
        const modalEl = document.getElementById(modalId);
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
    }

    document.getElementById("sortMonthSelect")?.addEventListener("change", function () {
        const value = this.value;
        if (!value) return;

        // Mặc định sort theo NGÀY LAO ĐỘNG
        currentSortField = "date";
        currentSortDir = value;

        localStorage.setItem("sortField", currentSortField);
        localStorage.setItem("sortDir", currentSortDir);

        currentPage = 1;
        triggerReload();
    });

    // xử hai form kia
    // ==============================
    // MỞ MODAL DANH SÁCH LỚP ĐÃ ĐĂNG KÝ (CHO ĐỢT LOẠI "LỚP")
    // ==============================
    window.moModalLopDaDangKy = function (dotId) {
        const content = document.getElementById("lopDaDangKyContent");
        const countEl = document.getElementById("lopDaDangKyCount");
        if (countEl) countEl.textContent = "";
        content.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-3 text-muted">Đang tải danh sách lớp...</p>
        </div>`;

        fetch(`/Admin/AdminWordRegister/GetDanhSachLopThamGia?dotId=${dotId}`)
            .then(res => res.json())
            .then(data => {
                if (!data.success || !data.data || data.data.length === 0) {
                    content.innerHTML = `
                    <div class="admin-modal-empty">
                        <span class="admin-modal-empty-icon"><i class="fas fa-school"></i></span>
                        <strong>Chưa có lớp nào đăng ký</strong>
                        <span>Các lớp đăng ký đợt lao động này sẽ được hiển thị tại đây.</span>
                    </div>`;
                    if (countEl) countEl.textContent = "0 lớp";
                } else {
                    let html = `
                    <div class="admin-modal-table-wrap">
                        <table class="table admin-modal-table align-middle mb-0">
                            <colgroup>
                                <col style="width: 7%;">
                                <col style="width: 20%;">
                                <col style="width: 41%;">
                                <col style="width: 15%;">
                                <col style="width: 17%;">
                            </colgroup>
                            <thead>
                                <tr>
                                    <th class="col-index">STT</th>
                                    <th>Tên lớp</th>
                                    <th>Khoa</th>
                                    <th class="text-center">Số SV</th>
                                    <th class="text-center">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>`;

                    data.data.forEach((lop, i) => {
                        html += `
                        <tr>
                            <td class="text-center col-index">${i + 1}</td>
                            <td class="cell-name">${lop.TenLop || ''}</td>
                            <td>${lop.TenKhoa || ''}</td>
                            <td class="text-center fw-bold text-primary">${lop.SoLuongSinhVien || 0}</td>
                            <td class="text-center">
                                <button class="btn btn-sm btn-outline-success text-nowrap" onclick="moModalSinhVienLop('${lop.TenLop}', ${dotId})">
                                    <i class="fas fa-list-ul me-1"></i> Xem SV
                                </button>
                            </td>
                        </tr>`;
                    });

                    html += `</tbody></table></div>`;
                    content.innerHTML = html;
                    if (countEl) countEl.textContent = `Tổng cộng ${data.data.length} lớp`;
                }

                new bootstrap.Modal(document.getElementById("lopDaDangKyModal")).show();
            })
            .catch(err => {
                console.error("Lỗi tải danh sách lớp:", err);
                content.innerHTML = `
                <div class="admin-modal-empty">
                    <span class="admin-modal-empty-icon text-danger"><i class="fas fa-exclamation-triangle"></i></span>
                    <strong>Không tải được dữ liệu</strong>
                    <span>Vui lòng thử lại sau ít phút.</span>
                </div>`;
                new bootstrap.Modal(document.getElementById("lopDaDangKyModal")).show();
            });
    };

    // ==============================
    // MỞ MODAL DANH SÁCH SINH VIÊN CỦA LỚP
    // ==============================
    window.moModalSinhVienLop = function (tenLop, dotId) {
        document.getElementById("tenLopHienThi").textContent = tenLop;
        const tbody = document.getElementById("sinhVienLopBody");
        const countEl = document.getElementById("sinhVienLopCount");
        const studentModalEl = document.getElementById("sinhVienLopModal");
        const listModalEl = document.getElementById("lopDaDangKyModal");
        const listModal = bootstrap.Modal.getInstance(listModalEl);
        const reopenList = !!listModal && listModalEl.classList.contains("show");
        const openStudentModal = () => new bootstrap.Modal(studentModalEl).show();

        if (countEl) countEl.textContent = "";
        tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4"><div class="spinner-border text-success"></div></td></tr>`;

        if (reopenList) {
            listModal.hide();
            setTimeout(openStudentModal, 260);
            studentModalEl.addEventListener("hidden.bs.modal", function () {
                new bootstrap.Modal(listModalEl).show();
            }, { once: true });
        }

        // Dùng API GetSinhVienThamGia và lọc theo tên lớp
        fetch(`/Admin/AdminWordRegister/GetSinhVienThamGia?maDot=${dotId}`)
            .then(res => res.json())
            .then(data => {
                if (!data.success || !data.data || data.data.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-5">Không có dữ liệu</td></tr>`;
                    if (countEl) countEl.textContent = "0 sinh viên";
                } else {
                    const svCuaLop = data.data.filter(sv => (sv.TenLop || "").trim() === tenLop.trim());

                    if (svCuaLop.length === 0) {
                        tbody.innerHTML = `<tr><td colspan="3"><div class="admin-modal-empty is-inline">
                            <span class="admin-modal-empty-icon"><i class="fas fa-user-graduate"></i></span>
                            <strong>Lớp chưa có sinh viên đăng ký</strong>
                            <span>Danh sách sinh viên của lớp sẽ hiển thị khi có đăng ký.</span>
                        </div></td></tr>`;
                        if (countEl) countEl.textContent = "0 sinh viên";
                    } else {
                        tbody.innerHTML = svCuaLop.map((sv, i) => `
                        <tr>
                            <td class="text-center col-index">${i + 1}</td>
                            <td class="col-code">${sv.MSSV || ""}</td>
                            <td class="cell-name">${sv.TenSinhVien || sv.HoTen || ""}</td>
                        </tr>
                    `).join("");
                        if (countEl) countEl.textContent = `Tổng cộng ${svCuaLop.length} sinh viên`;
                    }
                }
                if (!reopenList) openStudentModal();
            })
            .catch(err => {
                console.error("Lỗi tải danh sách sinh viên lớp:", err);
                tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger py-4">Lỗi tải dữ liệu</td></tr>`;
                if (!reopenList) openStudentModal();
            });
    };

    // ==============================
    // XỬ LÝ XÁC NHẬN TẠM NGƯNG / MỞ LẠI ĐỢT TỪ MODAL
    // ==============================
    const btnConfirmTamDung = document.getElementById("btnConfirmTamDung");
    if (btnConfirmTamDung) {
        btnConfirmTamDung.addEventListener("click", function () {
            const id = document.getElementById("tamDungDotId")?.value;
            const actionType = document.getElementById("tamDungActionType")?.value;
            const lyDoInput = document.getElementById("tamDungLyDo");
            let lyDo = lyDoInput ? lyDoInput.value.trim() : "";

            if (actionType === "pause" && !lyDo) {
                showToast("Vui lòng nhập lý do tạm ngưng đợt lao động!", "warning");
                if (lyDoInput) lyDoInput.focus();
                return;
            }

            btnConfirmTamDung.disabled = true;
            btnConfirmTamDung.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Đang xử lý...';

            fetch(`/Admin/AdminWordRegister/ToggleTamNgung`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: parseInt(id, 10), lyDo: lyDo })
            })
            .then(r => r.json())
            .then(res => {
                btnConfirmTamDung.disabled = false;
                btnConfirmTamDung.innerHTML = '<i class="fas fa-check me-1"></i> <span id="btnConfirmTamDungText">Xác nhận</span>';

                if (res.success) {
                    showToast(res.message || "Cập nhật trạng thái thành công!", "success");
                    const modalEl = document.getElementById("modalTamDungDot");
                    if (modalEl) {
                        const modalInstance = bootstrap.Modal.getInstance(modalEl);
                        if (modalInstance) modalInstance.hide();
                    }
                    loadDataToTable(currentPage);
                } else {
                    showToast(res.message || "Lỗi cập nhật trạng thái!", "error");
                }
            })
            .catch(err => {
                console.error("Lỗi:", err);
                btnConfirmTamDung.disabled = false;
                btnConfirmTamDung.innerHTML = '<i class="fas fa-check me-1"></i> <span id="btnConfirmTamDungText">Xác nhận</span>';
                showToast("Lỗi kết nối server!", "error");
            });
        });
    }

});