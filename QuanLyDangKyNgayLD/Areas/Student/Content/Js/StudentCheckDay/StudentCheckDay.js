// StudentCheckDay.js - Điểm danh cho sinh viên (2 bảng riêng)
document.addEventListener("DOMContentLoaded", function () {
    const choDuyetBody = document.getElementById("choDuyetBody");
    const daDuyetBody = document.getElementById("daDuyetBody");
    const loadingChoDuyet = document.getElementById("loadingChoDuyet");
    const loadingDaDuyet = document.getElementById("loadingDaDuyet");
    
    const hoanThanhBody = document.getElementById("hoanThanhBody");
    const loadingHoanThanh = document.getElementById("loadingHoanThanh");

 




    // Hàm load dữ liệu
    function loadDotDaDangKy() {
        // Hiển thị loading
        loadingChoDuyet.style.display = "table-row";
        loadingDaDuyet.style.display = "table-row";
        loadingHoanThanh.style.display = "table-row";

        fetch("/Student/StudentCheckDay/GetDotDaDangKy")
            .then(res => {
                if (!res.ok) throw new Error("Server error");
                return res.json();
            })
            .then(data => {
                loadingChoDuyet.style.display = "none";
                loadingDaDuyet.style.display = "none";
                loadingHoanThanh.style.display = "none";

                const setTabCount = function (id, value) {
                    const el = document.getElementById(id);
                    if (el) el.textContent = value;
                };
                setTabCount("countDaDuyet", (data.daDuyet || []).length);
                setTabCount("countChoDuyet", (data.choDuyet || []).length);
                setTabCount("countHoanThanh", (data.hoanThanh || []).length);

                if (!data.success) {
                    const errorMsg = data.message || "Lỗi tải dữ liệu";
                    choDuyetBody.innerHTML = `<tr><td colspan="7" class="student-empty is-error"><i class="fas fa-triangle-exclamation"></i><p class="student-empty-title">${errorMsg}</p></td></tr>`;
                    daDuyetBody.innerHTML = `<tr><td colspan="7" class="student-empty is-error"><i class="fas fa-triangle-exclamation"></i><p class="student-empty-title">${errorMsg}</p></td></tr>`;
                    hoanThanhBody.innerHTML = `<tr><td colspan="7" class="student-empty is-error"><i class="fas fa-triangle-exclamation"></i><p class="student-empty-title">${errorMsg}</p></td></tr>`;
                    return;
                }

                // === BẢNG CHỜ DUYỆT ===
                if (!data.choDuyet || data.choDuyet.length === 0) {
                    choDuyetBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="student-empty">
                            <i class="fas fa-clock"></i>
                            <p class="student-empty-title">Không có đợt nào đang chờ duyệt</p>
                            <p class="student-empty-text">Các đợt đã đăng ký và đang chờ xử lý sẽ xuất hiện tại đây.</p>
                        </td>
                    </tr>`;
                } else {
                    choDuyetBody.innerHTML = data.choDuyet.map((item, i) => `
                    <tr>
                        <td class="text-center">${i + 1}</td>
                        <td class="fw-bold">${item.DotLaoDong || ''}</td>
                        <td>${item.Buoi || ''}</td>
                        <td>${item.NgayLaoDong || ''}</td>
                        <td>${item.KhuVuc || ''}</td>
                        <td>${item.LoaiLaoDong || ''}</td>
                        <td class="text-center">
                            <span class="badge bg-warning text-dark">
                                <i class="fas fa-hourglass-half me-1"></i> Chờ duyệt
                            </span>
                        </td>
                    </tr>
                `).join("");
                }

                // === BẢNG ĐÃ DUYỆT ===
                if (!data.daDuyet || data.daDuyet.length === 0) {
                    daDuyetBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="student-empty">
                            <i class="fas fa-circle-check"></i>
                            <p class="student-empty-title">Chưa có đợt nào được duyệt để điểm danh</p>
                            <p class="student-empty-text">Khi đợt lao động được duyệt, bạn có thể điểm danh tại đây.</p>
                        </td>
                    </tr>`;
                } else {
                    daDuyetBody.innerHTML = data.daDuyet.map((item, i) => `
                    <tr>
                        <td class="text-center">${i + 1}</td>
                        <td class="fw-bold">${item.DotLaoDong || ''}</td>
                        <td>${item.Buoi || ''}</td>
                        <td>${item.NgayLaoDong || ''}</td>
                        <td>${item.KhuVuc || ''}</td>
                        <td>${item.LoaiLaoDong || ''}</td>
                        <td class="text-center">
                            ${item.DaDiemDanh ? `
                                <span class="badge bg-success fs-6">
                                    <i class="fas fa-check-circle me-1"></i> Đã điểm danh
                                </span>
                            ` : `
                                <form class="d-flex gap-2 justify-content-center" data-dot-id="${item.TaoDotLaoDong_id}">
                                    <input type="text"
                                           class="form-control form-control-sm text-center fw-bold"
                                           placeholder="Nhập mã"
                                           maxlength="10"
                                           style="width: 110px;"
                                           autocomplete="off"
                                           required>
                                    <button type="submit" class="btn btn-success btn-sm px-3">
                                        <i class="fas fa-check"></i>
                                    </button>
                                </form>
                                <div class="mt-2 small" id="status-${item.TaoDotLaoDong_id}"></div>
                            `}
                        </td>
                    </tr>
                `).join("");
                }

                // === BẢNG HOÀN THÀNH ===
                if (!data.hoanThanh || data.hoanThanh.length === 0) {
                    hoanThanhBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="student-empty">
                            <i class="fas fa-check-double"></i>
                            <p class="student-empty-title">Chưa có đợt nào hoàn thành điểm danh</p>
                            <p class="student-empty-text">Các đợt đã điểm danh đầy đủ sẽ được tổng hợp tại đây.</p>
                        </td>
                    </tr>`;
                } else {
                    hoanThanhBody.innerHTML = data.hoanThanh.map((item, i) => `
                    <tr>
                        <td class="text-center">${i + 1}</td>
                        <td class="fw-bold">${item.DotLaoDong || ''}</td>
                        <td>${item.Buoi || ''}</td>
                        <td>${item.NgayLaoDong || ''}</td>
                        <td>${item.KhuVuc || ''}</td>
                        <td>${item.LoaiLaoDong || ''}</td>
                        <td>
                            <span class="badge bg-primary fs-6">
                                <i class="fas fa-check-double me-1"></i> Hoàn thành
                            </span>
                        </td>
                    </tr>
                `).join("");
                }
            })
            .catch(err => {
                console.error("Lỗi load dữ liệu:", err);
                loadingChoDuyet.style.display = "none";
                loadingDaDuyet.style.display = "none";
                loadingHoanThanh.style.display = "none";
                const errorMsg = "Không thể kết nối máy chủ. Vui lòng thử lại.";
                const errorRow = `<tr><td colspan="7" class="student-empty is-error"><i class="fas fa-triangle-exclamation"></i><p class="student-empty-title">${errorMsg}</p></td></tr>`;
                choDuyetBody.innerHTML = errorRow;
                daDuyetBody.innerHTML = errorRow;
                hoanThanhBody.innerHTML = errorRow;
            });
    }


    // Xử lý điểm danh
    document.body.addEventListener("submit", function (e) {
        const form = e.target;
        if (!form.matches("form[data-dot-id]")) return;
        e.preventDefault();

        const dotId = form.dataset.dotId;
        const input = form.querySelector("input");
        const statusDiv = document.getElementById(`status-${dotId}`);
        let ma = input.value.trim().toUpperCase();

        if (!ma) {
            statusDiv.innerHTML = `<span class="text-danger"><i class="fas fa-exclamation-circle me-1"></i> Vui lòng nhập mã!</span>`;
            return;
        }

        // Disable form
        input.disabled = true;
        const btn = form.querySelector("button");
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Đang xử lý';

        fetch("/Student/StudentCheckDay/DiemDanhAjax", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: `dotId=${dotId}&maDiemDanh=${encodeURIComponent(ma)}`
        })
            .then(res => {
                if (!res.ok) throw new Error("Server error");
                return res.json();
            })
            .then(data => {
                if (data.success) {
                    statusDiv.innerHTML = `<span class="text-success fw-bold"><i class="fas fa-check-circle me-1"></i> ${data.message}</span>`;
                    // Thay form bằng badge "Đã điểm danh"
                    form.outerHTML = `
                    <span class="badge bg-success fs-6">
                        <i class="fas fa-check-circle me-1"></i> Đã điểm danh
                    </span>`;
                } else {
                    statusDiv.innerHTML = `<span class="text-danger"><i class="fas fa-times-circle me-1"></i> ${data.message}</span>`;
                }
            })
            .catch(err => {
                console.error("Lỗi điểm danh:", err);
                statusDiv.innerHTML = `<span class="text-danger"><i class="fas fa-exclamation-triangle me-1"></i> Lỗi kết nối!</span>`;
            })
            .finally(() => {
                // Chỉ enable lại nếu form vẫn tồn tại (chưa bị thay bằng badge)
                if (form.parentNode) {
                    input.disabled = false;
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-check"></i>';
                }
            });
    });

    // Load dữ liệu lần đầu
    loadDotDaDangKy();
});
