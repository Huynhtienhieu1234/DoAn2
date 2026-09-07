//==============================
// ĐĂNG KÝ LAO ĐỘNG SINH VIÊN - PHIÊN BẢN HOÀN CHỈNH
// MỖI BẢNG CÓ PHÂN TRANG RIÊNG
//==============================
let currentPageCaNhan = 1;
let currentPageLop = 1;
const pageSize = 5;

const today = new Date();
const currentMonth = today.getMonth() + 1;
const currentYear = today.getFullYear();

function parseDate(dateStr) {
    if (!dateStr) return null;
    const [day, month, year] = dateStr.split('/');
    return new Date(year, month - 1, day);
}

function isShiftExpired(ngayStr, buoi) {
    const d = parseDate(ngayStr);
    if (!d) return false;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (d < today) return true;
    
    if (d.getTime() === today.getTime()) {
        const totalMinutes = now.getHours() * 60 + now.getMinutes();
        const buoiStr = (buoi || "").toLowerCase().trim();
        
        // Ca sáng: Bắt đầu 07:00 (420 phút)
        if (buoiStr.includes("sáng") && totalMinutes >= 7 * 60) {
            return true;
        }
        // Ca chiều: Bắt đầu 13:30 (810 phút)
        if (buoiStr.includes("chiều") && totalMinutes >= 13 * 60 + 30) {
            return true;
        }
    }
    return false;
}

// Hàm render phân trang
function renderPagination(containerId, pageNumbersId, prevId, nextId, currentPage, totalPages, gotoCallback) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const pageNumbers = document.getElementById(pageNumbersId);
    const prevBtn = document.getElementById(prevId);
    const nextBtn = document.getElementById(nextId);

    pageNumbers.innerHTML = "";

    if (totalPages <= 1) {
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }

    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;

    prevBtn.onclick = () => gotoCallback(Math.max(1, currentPage - 1));
    nextBtn.onclick = () => gotoCallback(Math.min(totalPages, currentPage + 1));

    const maxButtons = 5;
    let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);

    const addBtn = (p) => {
        const btn = document.createElement("button");
        btn.className = "page-btn";
        btn.textContent = p;
        if (p === currentPage) btn.classList.add("active");
        btn.onclick = () => gotoCallback(p);
        pageNumbers.appendChild(btn);
    };

    if (start > 1) addBtn(1);
    if (start > 2) {
        const ellipsis = document.createElement("span");
        ellipsis.className = "page-ellipsis";
        ellipsis.textContent = "...";
        pageNumbers.appendChild(ellipsis);
    }
    for (let i = start; i <= end; i++) addBtn(i);
    if (end < totalPages - 1) {
        const ellipsis = document.createElement("span");
        ellipsis.className = "page-ellipsis";
        ellipsis.textContent = "...";
        pageNumbers.appendChild(ellipsis);
    }
    if (end < totalPages) addBtn(totalPages);
}


let globalAllItems = [];

// Tải và render toàn bộ dữ liệu
function loadAndRenderData(showSpinner = true) {
    // Hiển thị loading khi cần
    if (showSpinner) {
        ["tableBody", "tableBodyCaNhan", "tableBodyLop"].forEach(id => {
            const tbody = document.getElementById(id);
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="9" class="text-center py-4">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Đang tải...</span>
                            </div>
                            <p class="mt-2 text-muted">Đang tải dữ liệu...</p>
                        </td>
                    </tr>`;
            }
        });
    }

    $.get("/Student/StudentRegisterWord/LoadDotLaoDong", {
        page: 1,
        pageSize: 1000,
        keyword: "",
        buoi: "",
        trangThai: ""
    }, function (res) {
        if (!res.success) {
            showMainToast(res.message || "Không thể tải dữ liệu từ máy chủ.", "error");
            return;
        }

        const isLopPho = res.role && res.role.trim() === "LopPhoLaoDong";
        const isSinhVien = res.role && res.role.trim() === "SinhVien";

        let allItems = res.items || [];
        globalAllItems = allItems;
        let itemsCaNhan = allItems;
        let itemsLop = [];

        if (isLopPho) {
            itemsLop = allItems.filter(item => (item.LoaiLaoDong || "").toLowerCase().trim() === "lớp");
            itemsCaNhan = allItems.filter(item => (item.LoaiLaoDong || "").toLowerCase().trim() !== "lớp");
        }

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);


        // Hàm render bảng chung (với logic riêng cho từng loại)
        function renderTable(tbodyId, dataItems, pageVar, paginationConfig) {
            const tbody = document.getElementById(tbodyId);
            if (!tbody) return;

            const sorted = [...dataItems].sort((a, b) => {
                const dateA = parseDate(a.NgayLaoDong);
                const dateB = parseDate(b.NgayLaoDong);
                const pastA = a.IsPast !== undefined ? a.IsPast : isShiftExpired(a.NgayLaoDong, a.Buoi);
                const pastB = b.IsPast !== undefined ? b.IsPast : isShiftExpired(b.NgayLaoDong, b.Buoi);
                if (!pastA && pastB) return -1;
                if (pastA && !pastB) return 1;
                return (dateA || 0) - (dateB || 0);
            });

            const totalPages = Math.ceil(sorted.length / pageSize) || 1;
            const startIdx = (pageVar - 1) * pageSize;
            const pageItems = sorted.slice(startIdx, startIdx + pageSize);

            tbody.innerHTML = "";

            if (pageItems.length === 0) {
                tbody.innerHTML = `
        <tr>
            <td colspan="9" class="text-center py-5">
                <div class="empty-state">
                    <i class="far fa-clipboard fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">Không có đợt lao động nào</h5>
                    <p class="text-muted small">Hiện chỉ hiển thị các đợt trong tháng ${currentMonth}/${currentYear}</p>
                </div>
            </td>
        </tr>`;
            } else {
                pageItems.forEach((item, idx) => {
                    const isLoaiLop = (item.LoaiLaoDong || "").toLowerCase().trim() === "lớp";
                    if (isSinhVien && isLoaiLop) return;

                    const trangThaiHTML = item.TrangThaiDuyet
                        ? `<span class="badge status-approved"><i class="fas fa-check-circle me-1"></i>Đã duyệt</span>`
                        : `<span class="badge status-pending"><i class="fas fa-clock me-1"></i>Chưa duyệt</span>`;

                    const daDangKy = item.SoLuongDaDangKy || 0;
                    const can = item.SoLuongSinhVien || 0;

                    let hienThiSoLuong;
                    if (isLoaiLop) {
                        const soLopDaDangKy = daDangKy > 0 ? 1 : 0;
                        hienThiSoLuong = `${soLopDaDangKy}/${can} lớp`;
                    } else {
                        hienThiSoLuong = `${daDangKy}/${can}`;
                    }

                    const mauSoLuong = daDangKy >= can ? "text-success fw-bold" : "text-danger fw-bold";
                    const isPast = item.IsPast !== undefined ? item.IsPast : isShiftExpired(item.NgayLaoDong, item.Buoi);

                    let thaoTacHTML = "";

                    if (isLoaiLop && isLopPho) {
                        if (isPast) {
                            thaoTacHTML = `<span class="text-muted fw-bold"><i class="fas fa-clock me-1"></i>Đã quá giờ</span>`;
                        } else if (item.DaDuyet) {
                            thaoTacHTML = `<span class="text-warning fw-bold"><i class="fas fa-lock me-1"></i>Đợt đã duyệt</span>`;
                        } else {
                            // ⭐ Gọi API kiểm tra đăng ký lớp
                            thaoTacHTML = `<span class="text-muted">Đang kiểm tra...</span>`;
                            $.get("/Student/StudentRegisterWord/KiemTraDangKyLop", { dotId: item.TaoDotLaoDong_id }, function (res) {
                                const btnText = res.daDangKy ? "Chỉnh sửa danh sách" : "Đăng ký lớp";
                                const btnClass = res.daDangKy ? "btn-warning" : "btn-success";
                                const btnHTML = `
                            <button class="btn ${btnClass} btn-sm px-4 fw-bold" onclick="moModalDangKyLop(${item.TaoDotLaoDong_id})">
                                <i class="fas fa-users me-2"></i>${btnText}
                            </button>`;
                                const cell = tbody.querySelector(`tr[data-dot-id="${item.TaoDotLaoDong_id}"] td.action-cell`);
                                if (cell) cell.innerHTML = btnHTML;
                            });
                        }
                    } else {
                        if (isPast) {
                            thaoTacHTML = `<span class="text-danger fw-bold"><i class="fas fa-clock me-1"></i>Đã quá giờ</span>`;
                        } else if (item.DaDuyet) {
                            thaoTacHTML = item.DaDangKy
                                ? `<span class="text-success fw-bold"><i class="fas fa-check-double me-1"></i>Đã đăng ký (đã duyệt)</span>`
                                : `<span class="text-warning fw-bold"><i class="fas fa-lock me-1"></i>Đợt đã duyệt</span>`;
                        } else {
                            thaoTacHTML = item.DaDangKy
                                ? `<div class="btn-group-action">
                             <button class="btn btn-cancel btn-sm" onclick="huyDangKy(${item.TaoDotLaoDong_id})">
                                 <i class="fas fa-user-minus me-1"></i>Hủy đăng ký
                             </button>
                           </div>`
                                : `<div class="btn-group-action">
                             <button class="btn btn-register btn-sm" onclick="dangKy(${item.TaoDotLaoDong_id})">
                                 <i class="fas fa-user-plus me-1"></i>Đăng ký
                             </button>
                           </div>`;
                        }
                    }

                    tbody.innerHTML += `
            <tr class="table-row-hover" data-dot-id="${item.TaoDotLaoDong_id}">
                <td class="text-center fw-bold text-muted ps-4">${startIdx + idx + 1}</td>
                <td class="px-2 text-center text-nowrap">
                    <span class="fw-semibold">${item.NgayLaoDong}</span>
                </td>
                <td><span class="badge badge-session">${item.Buoi || ''}</span></td>
                <td><span class="badge badge-type">${item.LoaiLaoDong || ''}</span></td>
                <td class="fw-bold text-success-emphasis">${item.GiaTri || 0}</td>
                <td><span class="badge badge-location"><i class="fas fa-map-marker-alt me-1"></i>${item.KhuVuc || ''}</span></td>
                <td class="count-cell">
                    <div class="d-flex align-items-center justify-content-center">
                        <i class="fas fa-users me-2 text-info"></i>
                        <span class="${mauSoLuong}">${hienThiSoLuong}</span>
                    </div>
                </td>
                <td>${trangThaiHTML}</td>
                <td class="text-center pe-4 action-cell">${thaoTacHTML}</td>
            </tr>`;
                });
            }

            if (paginationConfig) {
                renderPagination(
                    paginationConfig.container,
                    paginationConfig.numbers,
                    paginationConfig.prev,
                    paginationConfig.next,
                    pageVar,
                    totalPages,
                    (newPage) => {
                        window[paginationConfig.pageVarName] = newPage;
                        renderTable(tbodyId, dataItems, newPage, paginationConfig);
                    }
                );
            }
        }



        // === RENDER THEO ROLE ===
        if (isLopPho) {
            renderTable("tableBodyCaNhan", itemsCaNhan, currentPageCaNhan, {
                container: "paginationCaNhan",
                numbers: "pageNumbersCaNhan",
                prev: "prevCaNhan",
                next: "nextCaNhan",
                pageVarName: "currentPageCaNhan"
            });

            renderTable("tableBodyLop", itemsLop, currentPageLop, {
                container: "paginationLop",
                numbers: "pageNumbersLop",
                prev: "prevLop",
                next: "nextLop",
                pageVarName: "currentPageLop"
            });

            document.getElementById("sectionCaNhan").style.display = "block";
            document.getElementById("sectionLop").style.display = "block";
        } else {
            renderTable("tableBody", allItems, currentPageCaNhan, {
                container: "pagination",
                numbers: "pageNumbers",
                prev: "prev",
                next: "next",
                pageVarName: "currentPageCaNhan"
            });

            const secCaNhan = document.getElementById("sectionCaNhan");
            const secLop = document.getElementById("sectionLop");
            if (secCaNhan) secCaNhan.style.display = "none";
            if (secLop) secLop.style.display = "none";
        }
    }).fail(() => showMainToast("Lỗi kết nối máy chủ!", "error"));
}

// Khởi tạo
document.addEventListener("DOMContentLoaded", function () {
    loadAndRenderData(true);
});

// Cập nhật trạng thái một dòng mà không cần tải lại toàn bộ bảng
function updateRowUI(id, isRegistered, newCount, totalCount) {
    // 1. Cập nhật dữ liệu bộ nhớ
    const item = globalAllItems.find(x => x.TaoDotLaoDong_id === id);
    if (item) {
        item.DaDangKy = isRegistered;
        if (newCount !== undefined && newCount !== null) {
            item.SoLuongDaDangKy = newCount;
        }
        if (totalCount !== undefined && totalCount !== null) {
            item.SoLuongSinhVien = totalCount;
        }
    }

    // 2. Cập nhật DOM trực tiếp các dòng chứa đợt này
    const rows = document.querySelectorAll(`tr[data-dot-id="${id}"]`);
    rows.forEach(tr => {
        // Cập nhật nút bấm thao tác
        const actionCell = tr.querySelector(".action-cell") || tr.querySelector("td:last-child");
        if (actionCell) {
            if (isRegistered) {
                actionCell.innerHTML = `
                    <div class="btn-group-action">
                        <button class="btn btn-cancel btn-sm" onclick="huyDangKy(${id})">
                            <i class="fas fa-user-minus me-1"></i>Hủy đăng ký
                        </button>
                    </div>`;
            } else {
                actionCell.innerHTML = `
                    <div class="btn-group-action">
                        <button class="btn btn-register btn-sm" onclick="dangKy(${id})">
                            <i class="fas fa-user-plus me-1"></i>Đăng ký
                        </button>
                    </div>`;
            }
        }

        // Cập nhật số lượng hiển thị
        if (newCount !== undefined && newCount !== null && totalCount !== undefined && totalCount !== null) {
            const countSpan = tr.querySelector(".count-cell span");
            if (countSpan) {
                const isLoaiLop = item && (item.LoaiLaoDong || "").toLowerCase().trim() === "lớp";
                let hienThi;
                if (isLoaiLop) {
                    const soLop = newCount > 0 ? 1 : 0;
                    hienThi = `${soLop}/${totalCount} lớp`;
                } else {
                    hienThi = `${newCount}/${totalCount}`;
                }
                const mauSoLuong = newCount >= totalCount ? "text-success fw-bold" : "text-danger fw-bold";
                countSpan.className = mauSoLuong;
                countSpan.textContent = hienThi;
            }
        }
    });
}

// Đăng ký & Hủy - cập nhật trực tiếp tại dòng, không tải lại bảng
function dangKy(id) {
    $.post("/Student/StudentRegisterWord/DangKy", { id: id }, function (res) {
        if (!res.success) {
            return showMainToast(res.message || "Đăng ký thất bại!", "error");
        }
        showMainToast(res.message || "Đăng ký thành công!", "success");
        updateRowUI(id, true, res.soLuongDaDangKy, res.soLuongSinhVien);
    }).fail(function (xhr) {
        let msg = "Lỗi kết nối máy chủ!";
        if (xhr && xhr.responseJSON && xhr.responseJSON.message) {
            msg = xhr.responseJSON.message;
        } else if (xhr && xhr.responseText) {
            try {
                let parsed = JSON.parse(xhr.responseText);
                if (parsed.message) msg = parsed.message;
            } catch (e) {}
        }
        showMainToast(msg, "error");
    });
}

function huyDangKy(id) {
    $.post("/Student/StudentRegisterWord/HuyDangKy", { id: id }, function (res) {
        if (!res.success) {
            return showMainToast(res.message || "Hủy thất bại!", "error");
        }
        showMainToast(res.message || "Hủy đăng ký thành công!", "success");
        updateRowUI(id, false, res.soLuongDaDangKy, res.soLuongSinhVien);
    }).fail(function (xhr) {
        let msg = "Lỗi kết nối máy chủ!";
        if (xhr && xhr.responseJSON && xhr.responseJSON.message) {
            msg = xhr.responseJSON.message;
        } else if (xhr && xhr.responseText) {
            try {
                let parsed = JSON.parse(xhr.responseText);
                if (parsed.message) msg = parsed.message;
            } catch (e) {}
        }
        showMainToast(msg, "error");
    });
}