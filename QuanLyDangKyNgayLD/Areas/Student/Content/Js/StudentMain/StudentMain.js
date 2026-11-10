document.addEventListener("DOMContentLoaded", function () {
    // 1. Hiển thị ngày hôm nay tiếng Việt
    renderCurrentDate();

    // 2. Tải thông tin sinh viên từ API
    loadStudentData();

    // 3. Tải danh sách thông báo đợt lao động mới
    loadThongBaoLaoDong();
});

function renderCurrentDate() {
    const dateEl = document.getElementById("currentDateText");
    if (!dateEl) return;
    const now = new Date();
    const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const dayName = days[now.getDay()];
    const d = String(now.getDate()).padStart(2, "0");
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const y = now.getFullYear();
    dateEl.textContent = `${dayName}, ${d}/${m}/${y}`;
}

function loadStudentData() {
    fetch("/Student/MainSinhVien/GetStudentInfo?_t=" + Date.now())
        .then(r => r.json())
        .then(res => {
            if (res.success && res.data) {
                const sv = res.data;

                // Tên & Lời chào
                const hoten = sv.HoTen || "Sinh viên";
                setText("hoten", hoten);
                setText("heroStudentName", hoten);
                setText("navStudentName", hoten);

                // Thông tin chi tiết
                setText("mssv", sv.MSSVDisplay || sv.MSSV || "Chưa có");
                setText("email", sv.Email || "Chưa có");
                setText("soDienThoai", sv.SoDienThoai || "Chưa cập nhật");
                setText("gioiTinh", sv.GioiTinh || "Chưa cập nhật");
                setText("lopText", "Lớp: " + (sv.Lop || "Chưa có"));
                setText("khoaText", sv.Khoa || "Chưa có khoa");
                setText("vaitro", sv.VaiTro || "Sinh viên");

                // Avatar
                const avatarEl = document.getElementById("avatarImg");
                if (avatarEl) {
                    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(hoten)}&background=2563eb&color=fff&size=150&bold=true`;
                    if (sv.Avatar && sv.Avatar.trim() !== "" && !sv.Avatar.includes("Avarta.png")) {
                        avatarEl.src = sv.Avatar;
                    } else {
                        avatarEl.src = fallbackUrl;
                    }
                    avatarEl.onerror = function () {
                        this.onerror = null;
                        this.src = fallbackUrl;
                    };
                }

                // Tiến độ lao động
                const soNgay = sv.SoNgay || 0;
                const mucTieu = sv.MucTieu || 18;
                const phanTram = sv.PhanTram !== undefined ? sv.PhanTram : Math.min(100, Math.round(soNgay / mucTieu * 100));

                setText("soNgayCompleted", `${soNgay} <span class="fs-6 text-muted fw-normal">/ ${mucTieu} ngày</span>`);
                setText("phanTramProgress", `${phanTram}%`);

                const progressBar = document.getElementById("laborProgressBar");
                if (progressBar) {
                    progressBar.style.width = `${phanTram}%`;
                    progressBar.setAttribute("aria-valuenow", phanTram);
                }

                const statusBadge = document.getElementById("trangThaiLaoDongBadge");
                if (statusBadge) {
                    if (soNgay >= mucTieu) {
                        statusBadge.className = "badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-1";
                        statusBadge.innerHTML = '<i class="fas fa-check-circle me-1"></i> Đã hoàn thành';
                    } else {
                        statusBadge.className = "badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 py-1";
                        statusBadge.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Đang thực hiện';
                    }
                }
            } else {
                console.warn("GetStudentInfo response:", res.message);
            }
        })
        .catch(err => {
            console.error("Lỗi khi tải thông tin sinh viên:", err);
        });
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) {
        el.innerHTML = text;
    }
}

// Sao chép MSSV nhanh
function copyMSSV() {
    const mssvEl = document.getElementById("mssv");
    if (!mssvEl) return;
    const text = mssvEl.textContent.trim();
    if (!text || text === "...") return;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(`Đã sao chép MSSV: ${text}`, "success");
        }).catch(() => {
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const input = document.createElement("input");
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
    showToast(`Đã sao chép MSSV: ${text}`, "success");
}

// 4. Quản lý trạng thái đã xem thông báo đợt lao động mới
let currentNewBatchIds = [];

function getSeenBatchIds() {
    try {
        const stored = localStorage.getItem("seenLaborBatchIds");
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
}

function markAllBatchesAsSeen() {
    try {
        if (currentNewBatchIds && currentNewBatchIds.length > 0) {
            localStorage.setItem("seenLaborBatchIds", JSON.stringify(currentNewBatchIds));
        }
        // Ẩn badge đỏ trên chuông header và thẻ dashboard sau khi đã bấm xem
        const headerBadge = document.getElementById("headerBellBadge");
        if (headerBadge) headerBadge.style.display = "none";
        const cardBadge = document.getElementById("badgeThongBaoCount");
        if (cardBadge) cardBadge.style.display = "none";
    } catch (e) {}
}

// 5. Tải danh sách thông báo đợt lao động mới và cập nhật giao diện
function loadThongBaoLaoDong() {
    fetch("/Student/MainSinhVien/GetThongBaoDotMoi?_t=" + Date.now())
        .then(r => r.json())
        .then(res => {
            const tbody = document.getElementById("thongBaoTableBody");
            const headerBadge = document.getElementById("headerBellBadge");
            const cardBadge = document.getElementById("badgeThongBaoCount");

            if (!res.success || !res.data || res.data.length === 0) {
                if (tbody) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="5" class="text-center text-muted py-5">
                                <i class="fas fa-inbox fa-3x opacity-25 mb-2 d-block"></i>
                                <span class="fw-medium">Hiện tại chưa có thông báo đợt lao động mới</span>
                            </td>
                        </tr>`;
                }
                if (headerBadge) headerBadge.style.display = "none";
                if (cardBadge) cardBadge.style.display = "none";
                return;
            }

            currentNewBatchIds = res.data.map(x => x.TaoDotLaoDong_id);
            const seenIds = getSeenBatchIds();
            const unseenList = currentNewBatchIds.filter(id => !seenIds.includes(id));
            const unseenCount = unseenList.length;

            // Cập nhật số lượng thông báo mới lên chuông header và thẻ dashboard nếu còn đợt chưa xem
            if (unseenCount > 0) {
                if (headerBadge) {
                    headerBadge.textContent = unseenCount > 99 ? '99+' : unseenCount;
                    headerBadge.style.display = "inline-block";
                }
                if (cardBadge) {
                    cardBadge.textContent = `${unseenCount} đợt mới`;
                    cardBadge.style.display = "inline-block";
                }
            } else {
                if (headerBadge) headerBadge.style.display = "none";
                if (cardBadge) cardBadge.style.display = "none";
            }

            // Render danh sách thông báo vào modal
            if (tbody) {
                let html = "";
                res.data.forEach((item, index) => {
                    const isNew = !seenIds.includes(item.TaoDotLaoDong_id);
                    const buoiBadge = (item.Buoi || "").toLowerCase().includes("sáng")
                        ? `<span class="badge bg-warning text-dark"><i class="fas fa-sun me-1"></i>${item.Buoi}</span>`
                        : `<span class="badge bg-info text-white"><i class="fas fa-cloud-sun me-1"></i>${item.Buoi}</span>`;

                    const newBadge = isNew 
                        ? `<span class="badge bg-danger rounded-pill ms-1" style="font-size: 0.65rem;">Mới</span>` 
                        : '';

                    html += `
                        <tr style="cursor: pointer;" onclick="window.location.href='/Student/StudentRegisterWord'">
                            <td class="text-center fw-bold text-muted">${index + 1}</td>
                            <td>
                                <div class="fw-bold text-primary mb-1">
                                    <i class="fas fa-bullhorn text-warning me-1"></i>${item.TieuDe} ${newBadge}
                                </div>
                                <div class="small text-muted">
                                    <span class="badge bg-secondary-subtle text-secondary border me-1">${item.LoaiLaoDong || 'Cá nhân'}</span>
                                    <span class="badge bg-light text-dark border"><i class="fas fa-map-marker-alt text-danger me-1"></i>${item.KhuVuc || 'Chưa rõ'}</span>
                                </div>
                            </td>
                            <td>
                                <div class="text-secondary small mb-1">${item.MoTa}</div>
                                <div class="small text-dark fw-semibold">
                                    <span>Giá trị: <b class="text-success">${item.GiaTri} buổi</b></span>
                                    <span class="ms-2">Chỉ tiêu: <b class="text-primary">${item.SoLuongSinhVien} SV</b></span>
                                </div>
                            </td>
                            <td class="text-center text-nowrap">
                                <div class="fw-bold text-dark">${item.NgayLaoDong}</div>
                                <div class="mt-1">${buoiBadge}</div>
                            </td>
                            <td class="text-center text-nowrap">
                                <a href="/Student/StudentRegisterWord" class="btn btn-sm btn-primary rounded-pill px-3 fw-bold shadow-sm" onclick="event.stopPropagation();">
                                    <i class="fas fa-user-plus me-1"></i>Đăng ký
                                </a>
                            </td>
                        </tr>`;
                });
                tbody.innerHTML = html;
            }

            // Đăng ký sự kiện mở modal để tự động đánh dấu đã xem
            const modalEl = document.getElementById("modalThongBao");
            if (modalEl && !modalEl.dataset.seenListenerAdded) {
                modalEl.dataset.seenListenerAdded = "true";
                modalEl.addEventListener("show.bs.modal", function () {
                    markAllBatchesAsSeen();
                });
            }
        })
        .catch(err => {
            console.error("Lỗi khi tải thông báo lao động:", err);
            const tbody = document.getElementById("thongBaoTableBody");
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-danger py-4">
                            <i class="fas fa-exclamation-triangle me-1"></i> Không thể tải danh sách thông báo.
                        </td>
                    </tr>`;
            }
        });
}
