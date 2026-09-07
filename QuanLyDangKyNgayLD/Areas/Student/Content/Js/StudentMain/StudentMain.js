document.addEventListener("DOMContentLoaded", function () {
    // 1. Hiển thị ngày hôm nay tiếng Việt
    renderCurrentDate();

    // 2. Tải thông tin sinh viên từ API
    loadStudentData();
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
