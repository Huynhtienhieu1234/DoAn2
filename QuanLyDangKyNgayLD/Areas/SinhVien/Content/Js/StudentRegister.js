//==============================
// Phân trang cho bảng dữ liệu
//==============================

let currentPage = 1;
const pageSize = 5;

// Tự động lấy tháng hiện tại (tháng máy tính)
const today = new Date();
let currentMonth = today.getMonth() + 1; // JS tháng bắt đầu từ 0
let currentYear = today.getFullYear();

// Hàm chuyển dd/MM/yyyy → Date object
function parseDate(dateStr) {
    if (!dateStr) return null;
    const [day, month, year] = dateStr.split('/');
    return new Date(year, month - 1, day);
}

// Hàm load dữ liệu từ server và đổ vào bảng
function loadDataToTable(page, keyword = "", buoi = "", trangThai = "", thang = null) {
    $.get("/SinhVien/StudentRegisterWord/LoadDotLaoDong",
        {
            page: page,
            pageSize: pageSize,
            keyword: keyword,
            buoi: buoi,
            trangThai: trangThai,
            thang: thang || currentMonth  // Mặc định lọc theo tháng hiện tại
        },
        function (res) {
            if (res.success) {
                const tbody = document.getElementById("tableBody");
                tbody.innerHTML = "";

                if (res.items && res.items.length > 0) {
                    res.items.forEach((item, index) => {
                        // Định dạng trạng thái
                        let trangThaiHTML = '';
                        if (item.TrangThaiDuyet === true || item.TrangThaiText === "Đã duyệt") {
                            trangThaiHTML = `
                                <span class="badge status-approved">
                                    <i class="fas fa-check-circle me-1"></i>Đã duyệt
                                </span>`;
                        } else {
                            trangThaiHTML = `
                                <span class="badge status-pending">
                                    <i class="fas fa-clock me-1"></i>Chưa duyệt
                                </span>`;
                        }







                        // === XỬ LÝ NÚT THAO TÁC – ĐÚNG NGHIỆP VỤ THỰC TẾ ===
                        const now = new Date();
                        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                        const ngayLaoDongDate = parseDate(item.NgayLaoDong);

                        // CHỈ KHÓA KHI ĐÃ QUA NGÀY LAO ĐỘNG (dù đã duyệt hay chưa duyệt)
                        const isPast = ngayLaoDongDate < todayStart;

                        let thaoTacHTML = '';
                        if (isPast) {
                            // ĐÃ QUA NGÀY → KHÓA HOÀN TOÀN
                            thaoTacHTML = `<span class="text-danger fw-bold">Đã kết thúc</span>`;
                        } else {
                            // CÒN TRONG THÁNG + CHƯA QUA NGÀY → CHO ĐĂNG KÝ BÌNH THƯỜNG (DÙ CHƯA DUYỆT HAY ĐÃ DUYỆT)
                            thaoTacHTML = `
                                <div class="btn-group-action">
                                    <button class="btn btn-register me-2" onclick="dangKy(${item.TaoDotLaoDong_id})">
                                        <i class="fas fa-user-plus me-1"></i>Đăng ký
                                    </button>
                                    <button class="btn btn-cancel" onclick="huyDangKy(${item.TaoDotLaoDong_id})">
                                        <i class="fas fa-user-minus me-1"></i>Hủy
                                    </button>
                                </div>`;
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
                                        <span class="fw-semibold">${item.SoLuongSinhVien || 0}</span>
                                    </div>
                                </td>
                                <td>${trangThaiHTML}</td>
                                <td class="text-center pe-4">
                                    ${thaoTacHTML}
                                </td>
                            </tr>`;
                    });
                } else {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="9" class="text-center py-5">
                                <div class="empty-state">
                                    <i class="far fa-clipboard fa-3x text-muted mb-3"></i>
                                    <h5 class="text-muted">Không có đợt lao động nào trong tuần này</h5>
                                    <p class="text-muted small">Chỉ hiển thị các đợt từ hôm nay đến 7 ngày tới</p>
                                </div>
                            </td>
                        </tr>`;
                }

                // Vẽ lại phân trang
                renderPagination(res.page || 1, res.totalPages || 1);
            } else {
                console.error("Lỗi khi tải dữ liệu:", res.message);
                showError("Không thể tải dữ liệu. Vui lòng thử lại.");
            }
        })
        .fail(function (xhr, status, error) {
            console.error("Lỗi AJAX:", error);
            showError("Lỗi kết nối đến máy chủ.");
        });
}

// Hàm render phân trang (giữ nguyên của bạn)
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

    const maxButtons = 5;
    let start = Math.max(1, page - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);

    if (end - start + 1 < maxButtons) {
        start = Math.max(1, end - maxButtons + 1);
    }

    if (start > 1) {
        addPageButton(1);
        if (start > 2) addEllipsis();
    }

    for (let i = start; i <= end; i++) {
        addPageButton(i);
    }

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
}

// Hàm chuyển trang
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

// Hàm hiển thị lỗi
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

// Load dữ liệu lần đầu khi trang mở
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("tableBody").innerHTML = `
        <tr>
            <td colspan="9" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Đang tải...</span>
                </div>
                <p class="mt-2 text-muted">Đang tải dữ liệu tuần này...</p>
            </td>
        </tr>`;

    loadDataToTable(currentPage); // Tự động lọc tháng hiện tại + 7 ngày tới
});

// Hàm đăng ký
function dangKy(id) {
    if (confirm("Bạn có chắc chắn muốn đăng ký đợt lao động này?")) {
        $.post("/SinhVien/StudentRegisterWord/DangKy", { id: id }, function (res) {
            if (res.success) {
                alert(res.message || "Đăng ký thành công!");
                loadDataToTable(currentPage);
            } else {
                alert(res.message || "Đăng ký thất bại!");
            }
        }).fail(function () {
            alert("Lỗi kết nối đến máy chủ!");
        });
    }
}

// Hàm hủy đăng ký
function huyDangKy(id) {
    if (confirm("Bạn có chắc chắn muốn hủy đăng ký đợt lao động này?")) {
        $.post("/SinhVien/StudentRegisterWord/HuyDangKy", { id: id }, function (res) {
            if (res.success) {
                alert(res.message || "Hủy đăng ký thành công!");
                loadDataToTable(currentPage);
            } else {
                alert(res.message || "Hủy đăng ký thất bại!");
            }
        }).fail(function () {
            alert("Lỗi kết nối đến máy chủ!");
        });
    }
}