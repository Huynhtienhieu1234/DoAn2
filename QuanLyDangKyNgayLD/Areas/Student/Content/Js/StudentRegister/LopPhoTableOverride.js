// LopTableHandler.js
// Chỉ chạy khi có bảng Lớp (tức là tài khoản Lớp phó lao động)
// Mục đích: Render riêng bảng Lớp với nút "Đăng ký lớp" mở modal

document.addEventListener("DOMContentLoaded", function () {
    // Nếu không có bảng Lớp → thoát (không phải Lớp phó)
    if (!document.getElementById("tableBodyLop")) {
        return;
    }

    // Hàm render riêng cho bảng Lớp
    function renderLopTable(items, page = currentPageLop) {
        const tbody = document.getElementById("tableBodyLop");
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Sắp xếp giống hệt file gốc
        const sorted = [...items].sort((a, b) => {
            const dateA = parseDate(a.NgayLaoDong);
            const dateB = parseDate(b.NgayLaoDong);
            const pastA = dateA < todayStart;
            const pastB = dateB < todayStart;
            if (!pastA && pastB) return -1;
            if (pastA && !pastB) return 1;
            return (dateB || 0) - (dateA || 0);
        });

        const totalPages = Math.ceil(sorted.length / pageSize) || 1;
        const startIdx = (page - 1) * pageSize;
        const pageItems = sorted.slice(startIdx, startIdx + pageSize);

        tbody.innerHTML = "";

        if (pageItems.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-5">
                        <div class="empty-state">
                            <i class="far fa-clipboard fa-3x text-muted mb-3"></i>
                            <h5 class="text-muted">Không có đợt lao động lớp nào</h5>
                        </td>
                    </tr>`;
            renderPaginationLop(page, totalPages);
            return;
        }

        pageItems.forEach((item, idx) => {
            const trangThaiHTML = item.TrangThaiDuyet
                ? `<span class="badge status-approved"><i class="fas fa-check-circle me-1"></i>Đã duyệt</span>`
                : `<span class="badge status-pending"><i class="fas fa-clock me-1"></i>Chưa duyệt</span>`;

            const soLopDaDangKy = item.SoLopDaDangKy !== undefined ? item.SoLopDaDangKy : (item.SoLuongDaDangKy > 0 ? 1 : 0);
            const tongLop = item.SoLuongLop || 1;
            const gioiHanSV = item.SoLuongSinhVien || 20;
            const mauSoLuong = soLopDaDangKy >= tongLop ? "text-success fw-bold" : "text-danger fw-bold";

            const isPast = parseDate(item.NgayLaoDong) < todayStart;

            let thaoTacHTML = "";
            if (isPast) {
                thaoTacHTML = `<span class="text-secondary"><i class="fas fa-calendar-times me-1"></i>Đã kết thúc</span>`;
            } else if (item.DaDuyet) {
                thaoTacHTML = `<span class="text-warning fw-bold"><i class="fas fa-lock me-1"></i>Đợt đã duyệt</span>`;
            } else {
                thaoTacHTML = `
                    <button class="btn btn-success btn-sm px-3" onclick="moModalDangKyLop(${item.TaoDotLaoDong_id})">
                        <i class="fas fa-users me-2"></i>Đăng ký lớp
                    </button>`;
            }

            tbody.innerHTML += `
                <tr class="table-row-hover">
                    <td class="text-center fw-bold text-muted ps-4">${startIdx + idx + 1}</td>
                    <td class="px-2 text-center text-nowrap"><span class="fw-semibold">${item.NgayLaoDong}</span></td>
                    <td><span class="badge badge-session">${item.Buoi || ''}</span></td>
                    <td><span class="badge badge-type">${item.LoaiLaoDong || ''}</span></td>
                    <td class="fw-bold text-success-emphasis">${item.GiaTri || 0}</td>
                    <td><span class="badge badge-location"><i class="fas fa-map-marker-alt me-1"></i>${item.KhuVuc || ''}</span></td>
                    <td>
                        <div class="d-flex flex-column align-items-center justify-content-center">
                            <span class="${mauSoLuong}"><i class="fas fa-users me-1 text-primary"></i>${soLopDaDangKy}/${tongLop} lớp</span>
                            <small class="text-muted" style="font-size: 0.72rem;">(Tối đa ${gioiHanSV} SV/lớp)</small>
                        </div>
                    </td>
                    <td>${trangThaiHTML}</td>
                    <td class="text-center pe-4">${thaoTacHTML}</td>
                </tr>`;
        });

        renderPaginationLop(page, totalPages);
    }

    function renderPaginationLop(currentPage, totalPages) {
        renderPagination(
            "paginationLop",
            "pageNumbersLop",
            "prevLop",
            "nextLop",
            currentPage,
            totalPages,
            (newPage) => {
                currentPageLop = newPage;
                // Gọi lại từ dữ liệu đã có (không cần load lại từ server)
                $.get("/Student/StudentRegisterWord/LoadDotLaoDong", {
                    page: 1,
                    pageSize: 1000
                }, function (res) {
                    if (res.success) {
                        const itemsLop = (res.items || []).filter(item =>
                            (item.LoaiLaoDong || "").toLowerCase().trim() === "lớp"
                        );
                        renderLopTable(itemsLop, newPage);
                    }
                });
            }
        );
    }

    // Khi dữ liệu tải xong → render bảng Lớp riêng
    const originalLoad = loadAndRenderData;
    loadAndRenderData = function () {
        originalLoad(); // Gọi hàm gốc để render bảng Cá nhân

        // Sau đó render riêng bảng Lớp
        $.get("/Student/StudentRegisterWord/LoadDotLaoDong", {
            page: 1,
            pageSize: 1000
        }, function (res) {
            if (res.success) {
                const itemsLop = (res.items || []).filter(item =>
                    (item.LoaiLaoDong || "").toLowerCase().trim() === "lớp"
                );
                renderLopTable(itemsLop, currentPageLop);
            }
        });
    };

    // Reload lại lần đầu
    loadAndRenderData();
});