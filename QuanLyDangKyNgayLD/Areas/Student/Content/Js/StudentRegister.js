//==============================
// ĐĂNG KÝ LAO ĐỘNG SINH VIÊN - PHIÊN BẢN HOÀN CHỈNH CUỐI CÙNG (ĐÃ FIX 2 NÚT)
// Chỉ hiển thị trong tháng hiện tại | Cho đăng ký dù chưa duyệt | Khóa khi đã qua ngày
// Chỉ hiện 1 nút duy nhất: Đăng ký → Hủy → Đăng ký
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

            // ✅ DEBUG: In giá trị role từ server
            console.log("Role từ server:", res.role);
            console.log("Debug role:", res.debugRole);

            if (res.items && res.items.length > 0) {
                showMainToast(`Lọc thành công: tìm thấy ${res.items.length} kết quả`, "success");

                res.items.forEach((item, index) => {
                    // Trạng thái duyệt
                    const trangThaiHTML = item.TrangThaiDuyet === true
                        ? `<span class="badge status-approved"><i class="fas fa-check-circle me-1"></i>Đã duyệt</span>`
                        : `<span class="badge status-pending"><i class="fas fa-clock me-1"></i>Chưa duyệt</span>`;

                    // Số lượng + màu
                    const daDangKy = item.SoLuongDaDangKy || 0;
                    const can = item.SoLuongSinhVien || 0;
                    const mauSoLuong = daDangKy >= can ? "text-success fw-bold" : "text-danger fw-bold";

                    // Kiểm tra ngày đã qua chưa
                    const todayStart = new Date();
                    todayStart.setHours(0, 0, 0, 0);
                    const ngayLaoDongDate = parseDate(item.NgayLaoDong);
                    const isPast = ngayLaoDongDate < todayStart;

                    // ✅ FIXED: Kiểm tra loại lao động (normalize để compare)
                    const loaiLaoDongNormalized = item.LoaiLaoDong.toLowerCase().trim();
                    const isSinhVien = res.role && res.role.trim() === "SinhVien";
                    const isLoaiLop = loaiLaoDongNormalized === "lớp";

                    // Nút thao tác
                    let thaoTacHTML = "";
                    if (isSinhVien && isLoaiLop) {
                        thaoTacHTML = `<span class="text-danger fw-bold">Không được đăng ký</span>`;
                    } else if (isPast) {
                        thaoTacHTML = `<span class="text-danger fw-bold">Đã kết thúc</span>`;
                    } else {
                        thaoTacHTML = `
                            <div class="btn-group-action">
                                <button class="btn btn-register" onclick="dangKy(${item.TaoDotLaoDong_id})">
                                    <i class="fas fa-user-plus me-1"></i>Đăng ký
                                </button>
                            </div>`;
                    }

                    // ✅ FIXED: Ẩn hoàn toàn hàng "Lớp" nếu là sinh viên
                    if (isSinhVien && isLoaiLop) {
                        console.log(`Ẩn hàng "Lớp": ${item.DotLaoDong}`);
                        return; // Skip hàng này
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

// === PHÂN TRANG ===
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

function showError(message) {
    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = `
        <tr>
            <td colspan="9" class="text-center py-5">
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                    <h5 class="text-danger">Đã xảy ra lỗi</h5>
                    <p class="text-muted small">${message}</p>
                    <button class="btn btn-primary mt-2" onclick="loadDataToTable(1)">
                        <i class="fas fa-redo me-1"></i>Thử lại
                    </button>
                </div>
            </td>
        </tr>`;
}

// === TẢI DỮ LIỆU KHI MỞ TRANG ===
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

// === ĐĂNG KÝ → CHỈ HIỆN NÚT HỦY ===
function dangKy(id) {
    showMainToast("Đang xử lý đăng ký...", "info");

    $.post("/Student/StudentRegisterWord/DangKy", { id: id }, function (res) {
        if (!res.success) {
            showMainToast(res.message || "Đăng ký thất bại!", "error");
            return;
        }

        showMainToast("Đăng ký thành công!", "success");

        const row = document.querySelector(`button[onclick="dangKy(${id})"]`)?.closest('tr');
        if (!row) return;

        // Cập nhật số lượng
        const soLuongCell = row.cells[6];
        const span = soLuongCell.querySelector('span');
        const parts = span.innerText.split('/');
        let daDangKy = parseInt(parts[0]) || 0;
        const can = parseInt(parts[1]) || 0;
        daDangKy++;
        span.innerText = daDangKy + "/" + can;
        span.className = daDangKy >= can ? "text-success fw-bold" : "text-danger fw-bold";

        // Đổi thành nút Hủy
        row.cells[8].innerHTML = `
            <div class="btn-group-action">
                <button class="btn btn-cancel" onclick="huyDangKy(${id})">
                    <i class="fas fa-user-minus me-1"></i>Hủy đăng ký
                </button>
            </div>
        `;
    }).fail(() => showMainToast("Lỗi kết nối đến máy chủ!", "error"));
}

// === HỦY → QUAY LẠI NÚT ĐĂNG KÝ ===
function huyDangKy(id) {
    showMainToast("Đang hủy đăng ký...", "info");

    $.post("/Student/StudentRegisterWord/HuyDangKy", { id: id }, function (res) {
        if (!res.success) {
            showMainToast(res.message || "Hủy thất bại!", "error");
            return;
        }

        showMainToast("Hủy đăng ký thành công!", "success");

        const row = document.querySelector(`button[onclick="huyDangKy(${id})"]`)?.closest('tr');
        if (!row) return;

        // Cập nhật số lượng
        const soLuongCell = row.cells[6];
        const span = soLuongCell.querySelector('span');
        const parts = span.innerText.split('/');
        let daDangKy = parseInt(parts[0]) || 0;
        const can = parseInt(parts[1]) || 0;
        daDangKy = Math.max(0, daDangKy - 1);
        span.innerText = daDangKy + "/" + can;
        span.className = daDangKy < can ? "text-danger fw-bold" : "text-success fw-bold";

        // Quay lại nút Đăng ký
        row.cells[8].innerHTML = `
            <div class="btn-group-action">
                <button class="btn btn-register" onclick="dangKy(${id})">
                    <i class="fas fa-user-plus me-1"></i>Đăng ký
                </button>
            </div>
        `;
    }).fail(() => showMainToast("Lỗi kết nối đến máy chủ!", "error"));
}