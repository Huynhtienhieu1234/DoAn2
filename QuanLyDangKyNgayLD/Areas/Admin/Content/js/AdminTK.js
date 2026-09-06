// =========================================================
// THỐNG KÊ TIẾN ĐỘ LAO ĐỘNG - JAVASCRIPT CONTROLLER
// =========================================================

let currentTKPage = 1;
let searchTKTimeout = null;

function getStudentInitial(name) {
    if (!name) return "SV";
    const parts = name.trim().split(" ");
    if (parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        return lastPart.charAt(0).toUpperCase();
    }
    return "SV";
}

function loadData(page = 1) {
    currentTKPage = page;
    const khoa = document.getElementById("khoaFilter") ? document.getElementById("khoaFilter").value : "";
    const lop = document.getElementById("lopFilter") ? document.getElementById("lopFilter").value : "";
    const status = document.getElementById("statusFilter") ? document.getElementById("statusFilter").value : "";
    const keyword = document.getElementById("searchKeyword") ? document.getElementById("searchKeyword").value.trim() : "";
    const pageSizeSelector = document.getElementById("pageSizeSelector");
    const pageSize = pageSizeSelector ? parseInt(pageSizeSelector.value, 10) || 10 : 10;

    const tableContainer = document.getElementById("studentTable");
    if (tableContainer) {
        tableContainer.innerHTML = `
            <div class="tk-loading-overlay">
                <div class="spinner-border text-primary mb-2" role="status">
                    <span class="visually-hidden">Đang tải...</span>
                </div>
                <div class="fw-semibold">Đang tổng hợp dữ liệu thống kê...</div>
            </div>`;
    }

    const url = `/Admin/AdminTK/LoadData?khoa=${encodeURIComponent(khoa)}&lop=${encodeURIComponent(lop)}&keyword=${encodeURIComponent(keyword)}&status=${encodeURIComponent(status)}&page=${page}&pageSize=${pageSize}&_t=${Date.now()}`;

    fetch(url)
        .then(res => {
            if (!res.ok) throw new Error("Lỗi HTTP " + res.status);
            return res.json();
        })
        .then(data => {
            const stats = data.Stats || { TongSinhVien: 0, DaHoanThanh: 0, ChuaHoanThanh: 0, TienDoHoanThanh: 0 };
            const pagination = data.Pagination || { CurrentPage: 1, TotalPages: 1, TotalItems: 0, PageSize: pageSize };
            const students = data.Students || [];

            // 1. Cập nhật các thẻ KPI
            const elTongSV = document.getElementById("statTongSV");
            const elDaHoanThanh = document.getElementById("statDaHoanThanh");
            const elChuaHoanThanh = document.getElementById("statChuaHoanThanh");
            const elTyLeHoanThanh = document.getElementById("statTyLeHoanThanh");
            const elTyLeChuaHoanThanh = document.getElementById("statTyLeChuaHoanThanh");

            if (elTongSV) elTongSV.textContent = stats.TongSinhVien.toLocaleString("vi-VN");
            if (elDaHoanThanh) elDaHoanThanh.textContent = stats.DaHoanThanh.toLocaleString("vi-VN");
            if (elChuaHoanThanh) elChuaHoanThanh.textContent = stats.ChuaHoanThanh.toLocaleString("vi-VN");

            const tyLeHoanThanh = stats.TienDoHoanThanh || 0;
            const tyLeChua = stats.TongSinhVien > 0 ? Math.round((stats.ChuaHoanThanh / stats.TongSinhVien) * 1000) / 10 : 0;

            if (elTyLeHoanThanh) elTyLeHoanThanh.textContent = `${tyLeHoanThanh}%`;
            if (elTyLeChuaHoanThanh) elTyLeChuaHoanThanh.textContent = `${tyLeChua}%`;

            // 2. Cập nhật thanh tiến độ
            const progressBarFill = document.getElementById("progressBarFill");
            const progressText = document.getElementById("progressText");
            const progressSummary = document.getElementById("progressSummaryText");

            if (progressBarFill) progressBarFill.style.width = `${tyLeHoanThanh}%`;
            if (progressText) progressText.textContent = `${tyLeHoanThanh}%`;
            if (progressSummary) {
                progressSummary.innerHTML = `Đã hoàn thành: <strong class="text-success">${stats.DaHoanThanh}</strong> / ${stats.TongSinhVien} sinh viên`;
            }

            // 3. Dựng bảng dữ liệu
            let rowsHtml = "";
            if (students.length > 0) {
                const startStt = (pagination.CurrentPage - 1) * pageSize + 1;
                students.forEach((sv, idx) => {
                    const stt = startStt + idx;
                    const isCompleted = sv.SoNgay >= 18;
                    const percent = Math.min(100, Math.round((sv.SoNgay / 18) * 100));
                    const initial = getStudentInitial(sv.HoTen);

                    const statusBadge = isCompleted
                        ? `<span class="badge-status-completed">
                               <i class="fas fa-check-circle"></i> ${sv.SoNgay}/18 Ngày (Hoàn thành)
                           </span>`
                        : `<span class="badge-status-progress">
                               <i class="fas fa-clock"></i> ${sv.SoNgay}/18 Ngày (${percent}%)
                           </span>`;

                    rowsHtml += `
                        <tr>
                            <td class="text-center fw-bold text-muted" style="width: 60px;">${stt}</td>
                            <td class="text-center font-monospace fw-bold" style="width: 130px;">
                                <span class="badge bg-light text-dark border px-2 py-1">${sv.MSSV}</span>
                            </td>
                            <td>
                                <div class="d-flex align-items-center">
                                    <div class="student-avatar-pill">${initial}</div>
                                    <div>
                                        <div class="fw-bold text-dark">${sv.HoTen || "N/A"}</div>
                                    </div>
                                </div>
                            </td>
                            <td class="text-center">
                                <span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                                    ${sv.Lop || "Chưa có"}
                                </span>
                            </td>
                            <td>${sv.Khoa || "Chưa có"}</td>
                            <td class="text-center">
                                ${statusBadge}
                            </td>
                        </tr>`;
                });
            } else {
                rowsHtml = `
                    <tr>
                        <td colspan="6" class="text-center py-5 text-muted">
                            <i class="fas fa-inbox fa-3x text-secondary mb-3 opacity-50 d-block"></i>
                            <div class="fw-bold fs-6">Không tìm thấy sinh viên nào phù hợp</div>
                            <small class="text-muted">Vui lòng thay đổi từ khóa tìm kiếm hoặc bộ lọc Khoa / Lớp.</small>
                        </td>
                    </tr>`;
            }

            if (tableContainer) {
                tableContainer.innerHTML = `
                    <table class="tk-table table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th style="width: 6%;">STT</th>
                                <th style="width: 14%;">MSSV</th>
                                <th style="width: 28%;">Họ và tên</th>
                                <th style="width: 18%;">Lớp</th>
                                <th style="width: 20%;">Khoa</th>
                                <th style="width: 14%;">Tiến độ hoàn thành</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>`;
            }

            // 4. Phân trang
            const pagInfo = document.getElementById("paginationInfo");
            if (pagInfo) {
                if (pagination.TotalItems > 0) {
                    const fromIdx = (pagination.CurrentPage - 1) * pageSize + 1;
                    const toIdx = Math.min(pagination.CurrentPage * pageSize, pagination.TotalItems);
                    pagInfo.innerHTML = `Hiển thị <strong>${fromIdx} - ${toIdx}</strong> trên tổng số <strong>${pagination.TotalItems}</strong> sinh viên`;
                } else {
                    pagInfo.textContent = "Không có kết quả";
                }
            }

            renderTKPagination(pagination.CurrentPage, pagination.TotalPages);
        })
        .catch(err => {
            console.error("Lỗi khi tải thống kê:", err);
            if (tableContainer) {
                tableContainer.innerHTML = `
                    <div class="alert alert-danger m-3 text-center rounded-3">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Có lỗi xảy ra khi tải dữ liệu thống kê: ${err.message}. Vui lòng thử lại!
                    </div>`;
            }
        });
}

function renderTKPagination(currentPage, totalPages) {
    const container = document.getElementById("pagination");
    if (!container) return;

    if (totalPages <= 1) {
        container.innerHTML = "";
        return;
    }

    let pagHtml = "";

    // Nút Trước
    pagHtml += `<button class="tk-page-btn" ${currentPage === 1 ? "disabled" : ""} onclick="loadData(${currentPage - 1});">
                    <i class="fas fa-chevron-left"></i>
                </button>`;

    // Các trang
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        pagHtml += `<button class="tk-page-btn" onclick="loadData(1);">1</button>`;
        if (startPage > 2) {
            pagHtml += `<span class="px-1 text-muted">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        pagHtml += `<button class="tk-page-btn ${i === currentPage ? "active" : ""}" onclick="loadData(${i});">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pagHtml += `<span class="px-1 text-muted">...</span>`;
        }
        pagHtml += `<button class="tk-page-btn" onclick="loadData(${totalPages});">${totalPages}</button>`;
    }

    // Nút Sau
    pagHtml += `<button class="tk-page-btn" ${currentPage === totalPages ? "disabled" : ""} onclick="loadData(${currentPage + 1});">
                    <i class="fas fa-chevron-right"></i>
                </button>`;

    container.innerHTML = pagHtml;
}

function loadLopByKhoa(khoa, callback) {
    const lopSelect = document.getElementById("lopFilter");
    if (!lopSelect) return;

    if (!khoa) {
        lopSelect.innerHTML = `<option value="">-- Tất cả lớp --</option>`;
        if (typeof callback === "function") callback();
        return;
    }

    fetch(`/Admin/AdminTK/GetLopByKhoa?khoa=${encodeURIComponent(khoa)}`)
        .then(res => res.json())
        .then(data => {
            let options = `<option value="">-- Tất cả lớp (${khoa}) --</option>`;
            if (data && data.length > 0) {
                data.forEach(lop => {
                    options += `<option value="${lop}">${lop}</option>`;
                });
            }
            lopSelect.innerHTML = options;
            if (typeof callback === "function") callback();
        })
        .catch(err => {
            console.error(err);
            lopSelect.innerHTML = `<option value="">-- Tất cả lớp --</option>`;
            if (typeof callback === "function") callback();
        });
}

function exportExcel() {
    const khoa = document.getElementById("khoaFilter") ? document.getElementById("khoaFilter").value : "";
    const lop = document.getElementById("lopFilter") ? document.getElementById("lopFilter").value : "";
    const status = document.getElementById("statusFilter") ? document.getElementById("statusFilter").value : "";
    const keyword = document.getElementById("searchKeyword") ? document.getElementById("searchKeyword").value.trim() : "";

    const url = `/Admin/AdminTK/ExportExcel?khoa=${encodeURIComponent(khoa)}&lop=${encodeURIComponent(lop)}&keyword=${encodeURIComponent(keyword)}&status=${encodeURIComponent(status)}`;
    window.location.href = url;
}

document.addEventListener("DOMContentLoaded", () => {
    const khoaFilter = document.getElementById("khoaFilter");
    const lopFilter = document.getElementById("lopFilter");
    const statusFilter = document.getElementById("statusFilter");
    const searchKeyword = document.getElementById("searchKeyword");
    const btnReset = document.getElementById("btnResetFilter");
    const pageSizeSelector = document.getElementById("pageSizeSelector");

    // Khởi tạo
    if (khoaFilter && khoaFilter.value) {
        loadLopByKhoa(khoaFilter.value, () => loadData(1));
    } else {
        loadData(1);
    }

    // Sự kiện thay đổi Khoa
    if (khoaFilter) {
        khoaFilter.addEventListener("change", function () {
            loadLopByKhoa(this.value, () => loadData(1));
        });
    }

    // Sự kiện thay đổi Lớp
    if (lopFilter) {
        lopFilter.addEventListener("change", () => loadData(1));
    }

    // Sự kiện thay đổi Trạng thái
    if (statusFilter) {
        statusFilter.addEventListener("change", () => loadData(1));
    }

    // Sự kiện thay đổi Số dòng / trang
    if (pageSizeSelector) {
        pageSizeSelector.addEventListener("change", () => loadData(1));
    }

    // Tìm kiếm MSSV / Họ tên (debounce 300ms)
    if (searchKeyword) {
        searchKeyword.addEventListener("input", function () {
            clearTimeout(searchTKTimeout);
            searchTKTimeout = setTimeout(() => {
                loadData(1);
            }, 300);
        });
    }

    // Nút đặt lại bộ lọc
    if (btnReset) {
        btnReset.addEventListener("click", function () {
            if (khoaFilter) khoaFilter.value = "";
            if (lopFilter) lopFilter.innerHTML = `<option value="">-- Tất cả lớp --</option>`;
            if (statusFilter) statusFilter.value = "";
            if (searchKeyword) searchKeyword.value = "";
            loadData(1);
        });
    }
});
