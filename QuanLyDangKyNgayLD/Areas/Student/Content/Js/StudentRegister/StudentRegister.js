//==============================
// ĐĂNG KÝ LAO ĐỘNG SINH VIÊN - PHIÊN BẢN HOÀN CHỈNH (SẮP XẾP ĐÃ KẾT THÚC XUỐNG DƯỚI)
//==============================

let currentPage = 1;
const pageSize = 5;

// Lấy tháng + năm hiện tại
const today = new Date();
const currentMonth = today.getMonth() + 1;
const currentYear = today.getFullYear();

// Hàm chuyển dd/MM/yyyy → Date
function parseDate(dateStr) {
    if (!dateStr) return null;
    const [day, month, year] = dateStr.split('/');
    return new Date(year, month - 1, day);
}

// Load dữ liệu
function loadDataToTable(page, keyword = "", buoi = "", trangThai = "") {
    $.get("/Student/StudentRegisterWord/LoadDotLaoDong", {
        page: page,
        pageSize: pageSize,
        keyword: keyword,
        buoi: buoi,
        trangThai: trangThai
    }, function (res) {
        if (res.success) {
            const tbody = document.getElementById("tableBody");
            tbody.innerHTML = "";

            console.log("Role từ server:", res.role);
            console.log("Debug role:", res.debugRole);

            if (res.items && res.items.length > 0) {
                showMainToast(`Lọc thành công: tìm thấy ${res.items.length} kết quả`, "success");

                // Tính ngày hiện tại một lần
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);

                // Sắp xếp client-side: chưa kết thúc lên trước
                res.items.sort((a, b) => {
                    const dateA = parseDate(a.NgayLaoDong);
                    const dateB = parseDate(b.NgayLaoDong);
                    const isPastA = dateA < todayStart;
                    const isPastB = dateB < todayStart;

                    if (!isPastA && isPastB) return -1;
                    if (isPastA && !isPastB) return 1;
                    return dateA - dateB;
                });

                res.items.forEach((item, index) => {
                    // Trạng thái duyệt
                    const trangThaiHTML = item.TrangThaiDuyet === true
                        ? `<span class="badge status-approved"><i class="fas fa-check-circle me-1"></i>Đã duyệt</span>`
                        : `<span class="badge status-pending"><i class="fas fa-clock me-1"></i>Chưa duyệt</span>`;

                    // Số lượng + màu
                    const daDangKy = item.SoLuongDaDangKy || 0;
                    const can = item.SoLuongSinhVien || 0;
                    const mauSoLuong = daDangKy >= can ? "text-success fw-bold" : "text-danger fw-bold";

                    // Kiểm tra ngày đã qua
                    const ngayLaoDongDate = parseDate(item.NgayLaoDong);
                    const isPast = ngayLaoDongDate < todayStart;

                    // Kiểm tra loại lao động
                    const loaiLaoDongNormalized = (item.LoaiLaoDong || "").toLowerCase().trim();
                    const isSinhVien = res.role && res.role.trim() === "SinhVien";
                    const isLoaiLop = loaiLaoDongNormalized === "lớp";

                    // === LOGIC NÚT THAO TÁC HOÀN CHỈNH ===
                    let thaoTacHTML = "";

                    if (isSinhVien && isLoaiLop) {
                        thaoTacHTML = `<span class="text-danger fw-bold"><i class="fas fa-ban me-1"></i>Không được đăng ký</span>`;
                    } else if (isPast) {
                        thaoTacHTML = `<span class="text-danger fw-bold"><i class="fas fa-calendar-times me-1"></i>Đã kết thúc</span>`;
                    } else if (item.DaDuyet) {
                        // ĐÃ DUYỆT → KHÓA HOÀN TOÀN
                        if (item.DaDangKy) {
                            thaoTacHTML = `<span class="text-success fw-bold"><i class="fas fa-check-double me-1"></i>Đã đăng ký (đã duyệt)</span>`;
                        } else {
                            thaoTacHTML = `<span class="text-warning fw-bold"><i class="fas fa-lock me-1"></i>Đợt đã duyệt</span>`;
                        }
                    } else {
                        // CHƯA DUYỆT → CHO ĐĂNG KÝ / HỦY
                        if (item.DaDangKy) {
                            thaoTacHTML = `
                                <div class="btn-group-action">
                                    <button class="btn btn-cancel" onclick="huyDangKy(${item.TaoDotLaoDong_id})">
                                        <i class="fas fa-user-minus me-1"></i>Hủy đăng ký
                                    </button>
                                </div>`;
                        } else {
                            thaoTacHTML = `
                                <div class="btn-group-action">
                                    <button class="btn btn-register" onclick="dangKy(${item.TaoDotLaoDong_id})">
                                        <i class="fas fa-user-plus me-1"></i>Đăng ký
                                    </button>
                                </div>`;
                        }
                    }
                    // === KẾT THÚC LOGIC NÚT ===

                    // Ẩn hàng loại "Lớp" nếu là sinh viên
                    if (isSinhVien && isLoaiLop) {
                        return; // Skip render
                    }

                    tbody.innerHTML += `
                        <tr class="table-row-hover">
                            <td class="text-center fw-bold text-muted ps-4">${(page - 1) * pageSize + index + 1}</td>
                            <td class="px-1 text-center">
                                <span class="text-truncate d-inline-block w-100" style="max-width:83px;" title="${item.NgayLaoDong}">
                                    ${item.NgayLaoDong}
                                </span>
                            </td>
                            <td><span class="badge badge-session">${item.Buoi || ''}</span></td>
                            <td><span class="badge badge-type">${item.LoaiLaoDong || ''}</span></td>
                            <td class="fw-bold text-success-emphasis">${item.GiaTri || 0}</td>
                            <td>
                                <span class="badge badge-location">
                                    <i class="fas fa-map-marker-alt me-1"></i>${item.KhuVuc || ''}
                                </span>
                            </td>
                            <td>
                                <div class="d-flex align-items-center justify-content-center">
                                    <i class="fas fa-users me-2 text-info"></i>
                                    <span class="${mauSoLuong}">${daDangKy}/${can}</span>
                                </div>
                            </td>
                            <td>${trangThaiHTML}</td>
                            <td class="text-center pe-4">${thaoTacHTML}</td>
                        </tr>`;
                });
            } else {
                showMainToast("Không tìm thấy dữ liệu phù hợp với bộ lọc!", "warning");
                tbody.innerHTML = `
                    <tr>
                        <td colspan="9" class="text-center py-5">
                            <div class="empty-state">
                                <i class="far fa-clipboard fa-3x text-muted mb-3"></i>
                                <h5 class="text-muted">Không có đợt lao động nào trong tháng này</h5>
                                <p class="text-muted small">Hiện chỉ hiển thị các đợt trong tháng ${currentMonth}/${currentYear}</p>
                            </div>
                        </td>
                    </tr>`;
            }

            renderPagination(res.page || 1, res.totalPages || 1);
        } else {
            showMainToast("Không thể tải dữ liệu từ máy chủ.", "error");
        }
    }).fail(function () {
        showMainToast("Lỗi kết nối đến máy chủ.", "error");
    });
}
// === PHÂN TRANG, ĐĂNG KÝ, HỦY === (giữ nguyên như cũ, không thay đổi)
function renderPagination(page, totalPages) {
    // ... (giữ nguyên code cũ)
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
    nextBtn.disabled = page >= totalPages;
    nextBtn.onclick = () => gotoPage(page + 1);

    const maxButtons = 5;
    let start = Math.max(1, page - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);

    if (start > 1) addPageButton(1);
    if (start > 2) addEllipsis();
    for (let i = start; i <= end; i++) addPageButton(i);
    if (end < totalPages - 1) addEllipsis();
    if (end < totalPages) addPageButton(totalPages);

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
}

function gotoPage(p) {
    if (p < 1) return;
    currentPage = p;
    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = `
        <tr>
            <td colspan="9" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Đang tải...</span>
                </div>
                <p class="mt-2 text-muted">Đang tải trang ${p}...</p>
            </td>
        </tr>`;
    loadDataToTable(p);
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("tableBody").innerHTML = `
        <tr>
            <td colspan="9" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Đang tải...</span>
                </div>
                <p class="mt-2 text-muted">Đang tải dữ liệu tháng ${currentMonth}/${currentYear}...</p>
            </td>
        </tr>`;
    loadDataToTable(currentPage);
});

// Hàm đăng ký và hủy (giữ nguyên hoàn toàn)
function dangKy(id) {
    // ... (giữ nguyên code cũ)
    showMainToast("Đang xử lý đăng ký...", "info");

    $.post("/Student/StudentRegisterWord/DangKy", { id: id }, function (res) {
        if (!res.success) {
            showMainToast(res.message || "Đăng ký thất bại!", "error");
            return;
        }

        showMainToast("Đăng ký thành công!", "success");

        const row = document.querySelector(`button[onclick="dangKy(${id})"]`)?.closest('tr');
        if (!row) return;

        const soLuongCell = row.cells[6];
        const span = soLuongCell.querySelector('span');
        const parts = span.innerText.split('/');
        let daDangKy = parseInt(parts[0]) || 0;
        const can = parseInt(parts[1]) || 0;
        daDangKy++;
        span.innerText = daDangKy + "/" + can;
        span.className = daDangKy >= can ? "text-success fw-bold" : "text-danger fw-bold";

        row.cells[8].innerHTML = `
            <div class="btn-group-action">
                <button class="btn btn-cancel" onclick="huyDangKy(${id})">
                    <i class="fas fa-user-minus me-1"></i>Hủy đăng ký
                </button>
            </div>
        `;
    }).fail(() => showMainToast("Lỗi kết nối đến máy chủ!", "error"));
}

function huyDangKy(id) {
    // ... (giữ nguyên code cũ)
    showMainToast("Đang hủy đăng ký...", "info");

    $.post("/Student/StudentRegisterWord/HuyDangKy", { id: id }, function (res) {
        if (!res.success) {
            showMainToast(res.message || "Hủy thất bại!", "error");
            return;
        }

        showMainToast("Hủy đăng ký thành công!", "success");

        const row = document.querySelector(`button[onclick="huyDangKy(${id})"]`)?.closest('tr');
        if (!row) return;

        const soLuongCell = row.cells[6];
        const span = soLuongCell.querySelector('span');
        const parts = span.innerText.split('/');
        let daDangKy = parseInt(parts[0]) || 0;
        const can = parseInt(parts[1]) || 0;
        daDangKy = Math.max(0, daDangKy - 1);
        span.innerText = daDangKy + "/" + can;
        span.className = daDangKy < can ? "text-danger fw-bold" : "text-success fw-bold";

        row.cells[8].innerHTML = `
            <div class="btn-group-action">
                <button class="btn btn-register" onclick="dangKy(${id})">
                    <i class="fas fa-user-plus me-1"></i>Đăng ký
                </button>
            </div>
        `;
    }).fail(() => showMainToast("Lỗi kết nối đến máy chủ!", "error"));
}