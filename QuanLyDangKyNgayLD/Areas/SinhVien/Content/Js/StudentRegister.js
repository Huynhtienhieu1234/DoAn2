//==============================
// ĐĂNG KÝ LAO ĐỘNG SINH VIÊN - PHIÊN BẢN HOÀN CHỈNH CUỐI CÙNG
// Chỉ hiển thị trong tháng hiện tại | Cho đăng ký dù chưa duyệt | Khóa khi đã qua ngày
// Hiển thị số lượng đã đăng ký / cần + đổi màu đỏ → xanh
//==============================

let currentPage = 1;
const pageSize = 5;

// Lấy tháng + năm hiện tại để lọc dữ liệu
const today = new Date();
const currentMonth = today.getMonth() + 1; // JS tháng bắt đầu từ 0
const currentYear = today.getFullYear();

// Hàm chuyển chuỗi dd/MM/yyyy → Date object
function parseDate(dateStr) {
    if (!dateStr) return null;
    const [day, month, year] = dateStr.split('/');
    return new Date(year, month - 1, day);
}

// Hàm load dữ liệu từ server
function loadDataToTable(page, keyword = "", buoi = "", trangThai = "") {
    $.get("/SinhVien/StudentRegisterWord/LoadDotLaoDong", {
        page: page,
        pageSize: pageSize,
        keyword: keyword,
        buoi: buoi,
        trangThai: trangThai
    }, function (res) {
        if (res.success) {
            const tbody = document.getElementById("tableBody");
            tbody.innerHTML = "";

            if (res.items && res.items.length > 0) {
                res.items.forEach((item, index) => {
                    // === Trạng thái duyệt ===
                    const trangThaiHTML = item.TrangThaiDuyet === true
                        ? `<span class="badge status-approved"><i class="fas fa-check-circle me-1"></i>Đã duyệt</span>`
                        : `<span class="badge status-pending"><i class="fas fa-clock me-1"></i>Chưa duyệt</span>`;

                    // === Số lượng đã đăng ký / cần + đổi màu ===
                    const daDangKy = item.SoLuongDaDangKy || 0;
                    const can = item.SoLuongSinhVien || 0;
                    const mauSoLuong = daDangKy >= can ? "text-success fw-bold" : "text-danger fw-bold";

                    // === Kiểm tra ngày lao động đã qua chưa ===
                    const todayStart = new Date();
                    todayStart.setHours(0, 0, 0, 0);
                    const ngayLaoDongDate = parseDate(item.NgayLaoDong);
                    const isPast = ngayLaoDongDate < todayStart;

                    // === Nút thao tác ===
                    const thaoTacHTML = isPast
                        ? `<span class="text-danger fw-bold">Đã kết thúc</span>`
                        : `<div class="btn-group-action">
                                <button class="btn btn-register me-2" onclick="dangKy(${item.TaoDotLaoDong_id})">
                                    <i class="fas fa-user-plus me-1"></i>Đăng ký
                                </button>
                                <button class="btn btn-cancel" onclick="huyDangKy(${item.TaoDotLaoDong_id})">
                                    <i class="fas fa-user-minus me-1"></i>Hủy
                                </button>
                           </div>`;

                    // === Thêm dòng vào bảng ===
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
            showError("Không thể tải dữ liệu từ máy chủ.");
        }
    }).fail(function () {
        showError("Lỗi kết nối đến máy chủ.");
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

// === ĐĂNG KÝ & HỦY ĐĂNG KÝ ===
function dangKy(id) {
    if (confirm("Bạn có chắc chắn muốn đăng ký đợt lao động này?")) {
        $.post("/SinhVien/StudentRegisterWord/DangKy", { id: id }, function (res) {
            if (res.success) {
                alert(res.message || "Đăng ký thành công!");
                loadDataToTable(currentPage);
            } else {
                alert(res.message || "Đăng ký thất bại!");
            }
        }).fail(() => alert("Lỗi kết nối đến máy chủ!"));
    }
}

function huyDangKy(id) {
    if (confirm("Bạn có chắc chắn muốn hủy đăng ký đợt lao động này?")) {
        $.post("/SinhVien/StudentRegisterWord/HuyDangKy", { id: id }, function (res) {
            if (res.success) {
                alert(res.message || "Hủy đăng ký thành công!");
                loadDataToTable(currentPage);
            } else {
                alert(res.message || "Hủy đăng ký thất bại!");
            }
        }).fail(() => alert("Lỗi kết nối đến máy chủ!"));
    }
}