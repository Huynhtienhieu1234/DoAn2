// CreateCode.js - Chuyên xử lý điểm danh bằng mã cho Admin
// Hiển thị mã điểm danh + Xem danh sách sinh viên đã điểm danh

document.addEventListener("DOMContentLoaded", function () {
    const copyBtn = document.getElementById("btnCopyMaDiemDanh");
    const copyBtnHtml = copyBtn ? copyBtn.innerHTML : "";

    function resetCopyButton() {
        if (!copyBtn) return;
        copyBtn.classList.remove("is-copied");
        copyBtn.innerHTML = copyBtnHtml;
    }

    function copyCode() {
        const code = document.getElementById("maDiemDanhDisplay")?.textContent.trim();
        if (!code || code === "------") return;

        const done = () => {
            if (!copyBtn) return;
            copyBtn.classList.add("is-copied");
            copyBtn.innerHTML = '<i class="fas fa-check me-1"></i> Đã sao chép';
            setTimeout(resetCopyButton, 2200);
        };

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(code).then(done).catch(() => fallbackCopy(code, done));
        } else {
            fallbackCopy(code, done);
        }
    }

    function fallbackCopy(text, done) {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        try {
            document.execCommand("copy");
            done();
        } catch (err) {
            console.error("Lỗi sao chép mã:", err);
            showToast("Không thể sao chép mã, vui lòng chọn mã và sao chép thủ công.", "error");
        } finally {
            document.body.removeChild(area);
        }
    }

    if (copyBtn) copyBtn.addEventListener("click", copyCode);

    // Gộp 2 listener thành 1 để tối ưu và dễ quản lý
    document.body.addEventListener("click", function (e) {
        // ==================== 1. NÚT HIỂN THỊ MÃ ĐIỂM DANH ====================
        const showCodeBtn = e.target.closest(".btn-show-code");
        if (showCodeBtn) {
            const dotId = showCodeBtn.dataset.id;
            const daDuyet = showCodeBtn.dataset.daduyet;
            if (daDuyet === "0") {
                if (typeof showToast === "function") {
                    showToast("Đợt lao động này chưa được duyệt. Bạn vui lòng bấm Duyệt đợt trước khi cấp mã điểm danh!", "warning");
                } else {
                    alert("Đợt lao động này chưa được duyệt. Bạn vui lòng bấm Duyệt đợt trước khi cấp mã điểm danh!");
                }
                return;
            }
            showCodeBtn.disabled = true;

            fetch("/Admin/AdminWordRegister/HienThiMaDiemDanh", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "RequestVerificationToken": document.querySelector('input[name="__RequestVerificationToken"]')?.value || ""
                },
                body: JSON.stringify({ dotId: parseInt(dotId) })
            })
                .then(response => {
                    if (!response.ok) throw new Error("Server error");
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        document.getElementById("maDiemDanhDisplay").textContent = data.maDiemDanh;
                        document.getElementById("tenDotHienThi").textContent = data.tenDot || "Không xác định";
                        resetCopyButton();
                        bootstrap.Modal.getOrCreateInstance(document.getElementById("maDiemDanhModal")).show();
                    } else {
                        showToast(data.message || "Không thể lấy mã điểm danh!", "error");
                    }
                })
                .catch(err => {
                    console.error("Lỗi hiển thị mã:", err);
                    showToast("Lỗi kết nối đến server!", "error");
                })
                .finally(() => {
                    showCodeBtn.disabled = false;
                });
            return; // Dừng xử lý nếu đã click nút này
        }

        // ==================== 2. NÚT XEM DANH SÁCH ĐÃ ĐIỂM DANH ====================
        const viewAttendanceBtn = e.target.closest(".btn-view-attendance");
        if (viewAttendanceBtn) {
            const dotId = viewAttendanceBtn.dataset.id;

            const container = document.getElementById("dsDiemDanhTableContainer");
            const emptyMsg = document.getElementById("dsDiemDanhEmpty");
            const tbody = document.getElementById("dsDiemDanhBody");
            const subEl = document.getElementById("dsDiemDanhSub");
            const countEl = document.getElementById("dsDiemDanhCount");

            const esc = (value) => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
            const formatMSSV = (value) => {
                let code = String(value ?? "").trim();
                if (code.length === 9 && !code.startsWith("0")) code = "0" + code;
                return code;
            };

            // Trạng thái đang tải
            container.style.display = "block";
            emptyMsg.style.display = "none";
            if (subEl) subEl.textContent = "Đang tải danh sách điểm danh...";
            if (countEl) countEl.textContent = "";
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success me-2"></div>Đang tải danh sách...</td></tr>`;
            bootstrap.Modal.getOrCreateInstance(document.getElementById("danhSachDiemDanhModal")).show();

            fetch(`/Admin/AdminWordRegister/GetDanhSachDiemDanh?dotId=${dotId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.items && data.items.length > 0) {
                        emptyMsg.style.display = "none";
                        container.style.display = "block";

                        tbody.innerHTML = data.items.map((sv, index) => `
                        <tr>
                            <td class="col-index">${index + 1}</td>
                            <td class="col-code">${formatMSSV(sv.MSSV)}</td>
                            <td class="cell-name">${esc(sv.HoTen || "")}</td>
                            <td>${esc(sv.TenLop || "")}</td>
                            <td>${esc(sv.TenKhoa || "")}</td>
                            <td class="col-time"><span class="attendance-time">${esc(sv.ThoiGian || "")}</span></td>
                        </tr>
                    `).join("");

                        if (subEl) subEl.textContent = `${data.items.length} sinh viên đã xác nhận có mặt trong đợt lao động này.`;
                        if (countEl) countEl.textContent = `Tổng cộng ${data.items.length} sinh viên`;
                    } else {
                        container.style.display = "none";
                        emptyMsg.style.display = "block";
                        tbody.innerHTML = "";
                        if (subEl) subEl.textContent = data.success
                            ? "Chưa có sinh viên nào điểm danh trong đợt này."
                            : (data.message || "Không thể tải danh sách điểm danh.");
                        if (countEl) countEl.textContent = "0 sinh viên";
                    }
                })
                .catch(err => {
                    console.error("Lỗi tải danh sách điểm danh:", err);
                    container.style.display = "none";
                    emptyMsg.style.display = "block";
                    if (subEl) subEl.textContent = "Không thể tải danh sách điểm danh.";
                    if (countEl) countEl.textContent = "0 sinh viên";
                    const title = emptyMsg.querySelector("strong");
                    if (title) title.textContent = "Lỗi tải dữ liệu";
                    showToast("Lỗi tải danh sách điểm danh!", "error");
                });
        }
    });
});