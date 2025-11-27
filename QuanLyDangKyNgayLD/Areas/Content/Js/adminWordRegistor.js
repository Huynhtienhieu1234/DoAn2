// Quản lý Đợt Lao Động - Full JS
document.addEventListener("DOMContentLoaded", function () {
    let currentPage = 1;
    const pageSize = 5;
    let currentLoadedItems = []; // chứa dữ liệu đang hiển thị

    // ==============================
    // 1) Tải dữ liệu lần đầu
    // ==============================
    loadDataToTable();

    // ==============================
    // 2) Hàm load dữ liệu + loading
    // ==============================
    document.getElementById("createForm")?.addEventListener("submit", function (e) {
        e.preventDefault();

        const formData = new FormData(this);

        fetch(this.action, { method: "POST", body: formData })
            .then((res) => {
                if (!res.ok) {
                    return res.text().then(text => {
                        console.error("Server response:", text);
                        throw new Error("Server error");
                    });
                }
                return res.json();
            })
            .then((data) => {
                if (data.success) {
                    bootstrap.Modal.getInstance(document.getElementById("createModal")).hide();
                    showToast(data.message || "Tạo đợt thành công!");

                    // Tải lại dữ liệu
                    loadDataToTable(currentPage);

                    // Sau khi tải xong, sắp xếp lại để dòng mới nằm cuối
                    setTimeout(() => {
                        sortDotLaoDong(true); // hoặc false nếu bạn muốn tháng mới nhất lên đầu
                    }, 400);
                } else {
                    showToast(data.message || "Tạo thất bại!");
                }
            })
            .catch((err) => {
                console.error("Lỗi:", err);
                showToast("Lỗi kết nối hoặc server không phản hồi.");
            });
    });

    function loadDataToTable(page = 1, keyword = "", buoi = "", trangthai = "") {
        const tbody = document.getElementById("dotLaoDongTableBody");
        const tableWrapper = document.querySelector(".table-responsive");

        tableWrapper.classList.add("loading");
        tbody.classList.remove("fade-in");
        tbody.classList.add("fade-out");
        tbody.innerHTML = `
        <tr>
            <td colspan="10" class="text-center">
                <div class="spinner"></div> Đang tải dữ liệu...
            </td>
        </tr>
    `;

        fetch(`/Admin/AdminWordRegister/LoadDotLaoDong?page=${page}&pageSize=${pageSize}&keyword=${encodeURIComponent(keyword)}&buoi=${encodeURIComponent(buoi)}&trangThai=${encodeURIComponent(trangthai)}`)
            .then(res => res.json())

            .then(data => {
                currentLoadedItems = data.items || [];
                tableWrapper.classList.remove("loading");

                if (!data.items || data.items.length === 0) {
                    tbody.innerHTML = "<tr><td colspan='10' class='text-center'>Không có dữ liệu</td></tr>";
                    renderPagination(page, data.totalPages || 1);
                    return;
                }

                setTimeout(() => {
                    renderDataToTable(data.items, page);
                    renderPagination(page, data.totalPages || 1);
                }, 120);
            })
            .catch(() => {
                tableWrapper.classList.remove("loading");
                tbody.innerHTML = "<tr><td colspan='10' class='text-center text-danger'>Lỗi tải dữ liệu</td></tr>";
            });
    }

    // ==============================
    // 3) Render bảng
    // ==============================
    function renderDataToTable(items, page) {


        const tbody = document.getElementById("dotLaoDongTableBody");
        tbody.innerHTML = items.map((item, index) => {
            // Map buổi sang text hiển thị
            let buoiText = item.Buoi;
            if (buoiText === "Sáng") buoiText = "Sáng (7h-8h30)";
            if (buoiText === "Chiều") buoiText = "Chiều (13h-14h)";

            return `
                <tr
                  data-id="${item.TaoDotLaoDong_id}" 
                  data-mota="${(item.MoTa || '').replace(/"/g, '&quot;').replace(/\n/g, ' ')}"
                  data-nguoitao="${String(item.NguoiTao || '').replace(/"/g, '&quot;')}"

                >
                <td>${(page - 1) * pageSize + index + 1}</td>
                <td>${item.DotLaoDong}</td>
                <td>${buoiText}</td>
                <td>${item.LoaiLaoDong || ""}</td>
                <td class="text-success fw-bold">${item.GiaTri ?? ""}</td>
                <td>${item.NgayLaoDong || ""}</td>
                <td>${item.KhuVuc || ""}</td>
                <td class="${item.SoLuongDangKy < item.SoLuongSinhVien ? 'text-danger fw-bold' : 'text-success fw-bold'} text-center">
                    ${item.SoLuongDangKy}/${item.SoLuongSinhVien}
                </td>
                <td>
                    <span class="badge ${item.TrangThaiDuyet === 'Đã duyệt' ? 'bg-success' : 'bg-warning text-dark'}">
                        ${item.TrangThaiDuyet}
                    </span>
                </td>
                <td class="action-cell">
                    <button class="btn btn-sm btn-info btn-detail me-1 text-white" data-id="${item.TaoDotLaoDong_id}" title="Chi tiết">
                        <i class="fas fa-info-circle"></i>
                    </button>
                    <button class="btn btn-sm btn-warning btn-edit me-1" data-id="${item.TaoDotLaoDong_id}" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-delete me-1" data-id="${item.TaoDotLaoDong_id}" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                    ${item.TrangThaiDuyet === 'Chưa duyệt' ? `
                        <button class="btn btn-sm btn-success btn-approve" data-id="${item.TaoDotLaoDong_id}" title="Duyệt">
                            <i class="fas fa-check"></i>
                        </button>` : ""}
                </td>
            </tr>
        `;
        }).join("");

        setTimeout(() => {
            tbody.classList.remove("fade-out");
            tbody.classList.add("fade-in");
        }, 50);
    }


    // ==============================
    // 4) Phân trang
    // ==============================
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

        const maxButtons = 7;
        let start = Math.max(1, page - Math.floor(maxButtons / 2));
        let end = Math.min(totalPages, start + maxButtons - 1);
        if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);

        if (start > 1) {
            addPageButton(1);
            if (start > 2) addEllipsis();
        }
        for (let i = start; i <= end; i++) addPageButton(i);
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
        function gotoPage(p) {
            const keyword = document.getElementById("searchBox")?.value || "";
            const buoi = document.getElementById("sessionFilter")?.value || "";
            const trangThai = document.getElementById("statusFilter")?.value || "";
            currentPage = p;
            loadDataToTable(p, keyword, buoi, trangThai);
        }
    }

    // ==============================
    // 5) Mở modal: Tạo mới, Đã xóa
    // ==============================
    document.getElementById("btnAdd")?.addEventListener("click", function () {
        const form = document.getElementById("createForm");
        if (form) form.reset();
        new bootstrap.Modal(document.getElementById("createModal")).show();
    });

    // Replace btnViewDeleted fetch handler with this improved version
    document.getElementById("btnViewDeleted")?.addEventListener("click", function () {
        const body = document.getElementById("deletedTableBody");
        body.innerHTML = `<tr><td colspan="7" class="text-center"><div class="spinner"></div> Đang tải...</td></tr>`;

        fetch("/Admin/AdminWordRegister/GetDeletedDotLaoDong", { credentials: 'same-origin' })
            .then(res => {
                // log status for debugging
                console.log("GetDeletedDotLaoDong status:", res.status, res.statusText);
                const ct = res.headers.get('content-type') || '';
                if (!res.ok) {
                    // try to get text to show server error
                    return res.text().then(text => { throw new Error(`HTTP ${res.status}: ${text}`); });
                }
                if (!ct.includes('application/json')) {
                    return res.text().then(text => { throw new Error('Expected JSON but got: ' + text); });
                }
                return res.json();
            })
            .then(data => {
                if (!data.items || data.items.length === 0) {
                    body.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Không có dữ liệu</td></tr>`;
                } else {
                    const rows = data.items.map((x, i) => {
                        return `
                                    <tr>
                                        <td>${i + 1}</td>
                                        <td>${x.DotLaoDong || ""}</td>
                                        <td>${x.Buoi || ""}</td>
                                        <td>${x.NgayLaoDong || ""}</td>
                                        <td>${x.KhuVuc || ""}</td>
                                        <td>${x.Ngayxoa || ""}</td>
                                        <td>
                                            <button class="btn btn-sm btn-success btn-restore" data-id="${x.TaoDotLaoDong_id}">
                                                Khôi phục
                                            </button>
                                        </td>
                                    </tr>
                                `;
                    }).join("");

                    body.innerHTML = rows;

                }
                new bootstrap.Modal(document.getElementById("deletedModal")).show();
            })
            .catch(err => {
                console.error("Load deleted items failed:", err);
                body.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Lỗi tải dữ liệu</td></tr>`;
                new bootstrap.Modal(document.getElementById("deletedModal")).show();
            });
    });

    // ==============================
    // 6) Event delegation cho nút trong bảng
    // ==============================
    document.addEventListener("click", function (e) {
        const detailBtn = e.target.closest(".btn-detail");
        const editBtn = e.target.closest(".btn-edit");
        const deleteBtn = e.target.closest(".btn-delete");
        const approveBtn = e.target.closest(".btn-approve");
        const restoreBtn = e.target.closest(".btn-restore");

        // Chi tiết
        if (detailBtn) {
            const tr = detailBtn.closest("tr");
            const cells = tr.querySelectorAll("td");

            document.getElementById("detailDotLaoDong").textContent = cells[1]?.textContent || "";
            document.getElementById("detailBuoi").textContent = cells[2]?.textContent || "";
            document.getElementById("detailLoaiLaoDong").textContent = cells[3]?.textContent || "";
            document.getElementById("detailGiaTri").textContent = cells[4]?.textContent || "";
            document.getElementById("detailNgayLaoDong").textContent = cells[5]?.textContent || "";
            document.getElementById("detailKhuVuc").textContent = cells[6]?.textContent || "";

            let soLuongRaw = cells[7]?.textContent || "";
            let quyDinh = soLuongRaw.split("/")[1]?.trim() || "";
            document.getElementById("detailSoLuongSinhVien").textContent = quyDinh;

            document.getElementById("detailTrangThaiDuyet").textContent = tr.querySelector(".badge")?.textContent || "";

            const mota = tr.dataset.mota || "";
            document.getElementById("detailMoTa").textContent = mota;


            const nguoiTao = tr.dataset.nguoitao || "";
            document.getElementById("detailNguoiTao").textContent = nguoiTao;

            new bootstrap.Modal(document.getElementById("detailModal")).show();
        }



        // Sửa
        if (editBtn) {
            const tr = editBtn.closest("tr");
            const cells = tr.querySelectorAll("td");

            document.getElementById("editId").value = editBtn.dataset.id;
            document.getElementById("editDotLaoDong").value = cells[1]?.textContent || "";

            let buoiRaw = cells[2]?.textContent || "";
            let buoiValue = buoiRaw.includes("Sáng") ? "Sáng" : buoiRaw.includes("Chiều") ? "Chiều" : "";
            document.getElementById("editBuoi").value = buoiValue;

            document.getElementById("editLoaiLaoDong").value = cells[3]?.textContent || "";
            document.getElementById("editGiaTri").value = (cells[4]?.textContent || "").replace(/\D/g, "");

            let ngayRaw = cells[5]?.textContent || "";
            let ngayParts = ngayRaw.split("/");
            let ngayValue = ngayParts.length === 3 ? `${ngayParts[2]}-${ngayParts[1]}-${ngayParts[0]}` : "";
            document.getElementById("editNgayLaoDong").value = ngayValue;



            const khuVucRaw = cells[6]?.textContent.trim() || "";
            const khuVucSelect = document.getElementById("editKhuVuc");

            // Nếu dropdown có option khớp, gán vào
            if ([...khuVucSelect.options].some(opt => opt.value === khuVucRaw)) {
                khuVucSelect.value = khuVucRaw;
            } else {
                // Nếu không khớp, gán mặc định hoặc báo lỗi
                khuVucSelect.value = "";
                console.warn("Không tìm thấy khu vực:", khuVucRaw);
            }






            let soLuongRaw = cells[7]?.textContent || "";
            let quyDinh = soLuongRaw.split("/")[1]?.trim() || "";
            document.getElementById("editSoLuongSinhVien").value = quyDinh;

            const mota = tr.dataset.mota || "";
            document.getElementById("editMoTa").value = mota;



            new bootstrap.Modal(document.getElementById("editModal")).show();
        }




        // Xóa
        if (deleteBtn) {
            const tr = deleteBtn.closest("tr");
            const tenDot = tr.querySelector("td:nth-child(2)")?.textContent || "";
            document.getElementById("deleteDotInfo").textContent = `Đợt: ${tenDot} (ID: ${deleteBtn.dataset.id})`;
            document.getElementById("confirmDeleteBtn").dataset.id = deleteBtn.dataset.id;
            new bootstrap.Modal(document.getElementById("deleteModal")).show();
        }
        // Duyệt
        if (approveBtn) {
            const id = approveBtn.dataset.id;


            fetch(`/Admin/AdminWordRegister/ApproveAjax?id=${id}`, { method: "POST" })
                .then(res => res.json())
                .then(data => {
                    showToast(data.message || (data.success ? "Đã duyệt đợt lao động!" : "Duyệt thất bại"), data.success ? "success" : "error");
                    loadDataToTable(currentPage);
                })
                .catch(() => {
                    showToast("Lỗi kết nối đến máy chủ!", "error");
                });
        }

        if (restoreBtn) {
            const id = restoreBtn.dataset.id;
            const row = restoreBtn.closest("tr");

            restoreBtn.disabled = true;

            fetch(`/Admin/AdminWordRegister/RestoreAjax?id=${id}`, { method: "POST", credentials: 'same-origin' })
                .then(res => {
                    if (!res.ok) return res.text().then(text => { throw new Error(`HTTP ${res.status}: ${text}`); });
                    const ct = res.headers.get('content-type') || '';
                    if (!ct.includes('application/json')) return res.text().then(text => { throw new Error('Invalid JSON: ' + text); });
                    return res.json();
                })
                .then(data => {
                    showToast(data.message || (data.success ? "Đã khôi phục đợt lao động!" : "Khôi phục thất bại"), data.success ? "success" : "error");

                    if (data.success && row) {
                        // ✅ Xóa dòng khỏi bảng đã xóa với hiệu ứng mượt
                        row.style.transition = "opacity 0.4s ease";
                        row.style.opacity = "0";
                        setTimeout(() => row.remove(), 400);
                    }

                    // ✅ Cập nhật bảng chính
                    loadDataToTable(currentPage);
                })
                .catch(err => {
                    console.error("Restore failed:", err);
                    showToast("Lỗi khôi phục hoặc kết nối!", "error");
                })
                .finally(() => {
                    restoreBtn.disabled = false;
                });
        }



    });

    // ==============================
    // 7) Submit form AJAX: Create, Edit, Delete
    // ==============================


    document.getElementById("editForm")?.addEventListener("submit", function (e) {
        e.preventDefault();
        const formData = new FormData(this);
        fetch(this.action, { method: "POST", body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    bootstrap.Modal.getInstance(document.getElementById("editModal")).hide();
                    showToast(data.message || "Cập nhật thành công!");
                    loadDataToTable(currentPage);
                } else {
                    showToast(data.message || "Cập nhật thất bại!");
                }
            })
            .catch(() => showToast("Lỗi kết nối!"));
    });

    document.getElementById("confirmDeleteBtn")?.addEventListener("click", function () {
        const id = this.dataset.id;
        fetch(`/Admin/AdminWordRegister/DeleteAjax?id=${id}`, { method: "POST" })
            .then(res => res.json())
            .then(data => {
                bootstrap.Modal.getInstance(document.getElementById("deleteModal")).hide();
                showToast(data.message || (data.success ? "Đã xóa" : "Xóa thất bại"));
                loadDataToTable(currentPage);
            })
            .catch(() => showToast("Lỗi kết nối!"));
    });

    // ==============================
    // 8) Bộ lọc + tìm kiếm
    // ==============================
    document.getElementById("statusFilter")?.addEventListener("change", triggerReload);
    document.getElementById("sessionFilter")?.addEventListener("change", triggerReload);
    document.getElementById("searchBox")?.addEventListener("input", debounce(triggerReload, 300));

    function triggerReload() {
        const keyword = document.getElementById("searchBox")?.value || "";
        const buoi = document.getElementById("sessionFilter")?.value || "";
        const trangThai = document.getElementById("statusFilter")?.value || "";
        currentPage = 1;
        loadDataToTable(1, keyword, buoi, trangThai);
    }

    function debounce(fn, delay) {
        let t;
        return function (...args) {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // ==============================
    // 9) Tự động sinh ngày khi chọn tháng (Choices.js)
    // ==============================
    const monthSelect = document.getElementById("dotLaoDongMonth");
    const daySelect = document.getElementById("dotLaoDongDay");
    let dayChoices;

    if (daySelect) {
        dayChoices = new Choices(daySelect, {
            shouldSort: false,
            position: 'bottom',
            searchEnabled: false,
            itemSelectText: '',
        });
    }

    if (monthSelect && dayChoices) {
        const currentYear = new Date().getFullYear();

        monthSelect.value = "Tháng 1";
        fillDays("Tháng 1");

        monthSelect.addEventListener("change", function () {
            fillDays(this.value);
        });

        function fillDays(monthLabel) {
            if (!monthLabel) {
                dayChoices.clearChoices();
                return;
            }

            const monthNumber = parseInt(monthLabel.replace("Tháng ", ""));
            const daysInMonth = new Date(currentYear, monthNumber, 0).getDate();

            const choicesArray = Array.from({ length: daysInMonth }, (_, i) => {
                const d = i + 1;
                const dayStr = String(d).padStart(2, "0");
                const monthStr = String(monthNumber).padStart(2, "0");
                const value = `${currentYear}-${monthStr}-${dayStr}`; // giá trị chuẩn yyyy-MM-dd
                const label = `${dayStr}/${monthStr}/${currentYear}`; // hiển thị dd/MM/yyyy
                return {
                    value: value,
                    label: label,
                    selected: d === 1
                };
            });

            dayChoices.setChoices(choicesArray, 'value', 'label', true);
        }

    }
    // ==============================
    // 10. Tăng dần giảm dần
    // ==============================
    document.getElementById("sortMonthSelect")?.addEventListener("change", function () {
        const value = this.value;
        if (value === "asc") sortDotLaoDong(true);
        else if (value === "desc") sortDotLaoDong(false);
    });

    function sortDotLaoDong(isAsc) {
        const tbody = document.getElementById("dotLaoDongTableBody");
        const rows = Array.from(tbody.querySelectorAll("tr"));

        const monthMap = {
            "Tháng 1": 1, "Tháng 2": 2, "Tháng 3": 3, "Tháng 4": 4,
            "Tháng 5": 5, "Tháng 6": 6, "Tháng 7": 7, "Tháng 8": 8,
            "Tháng 9": 9, "Tháng 10": 10, "Tháng 11": 11, "Tháng 12": 12
        };

        rows.sort((a, b) => {
            const aText = a.querySelector("td:nth-child(2)")?.textContent.trim() || "";
            const bText = b.querySelector("td:nth-child(2)")?.textContent.trim() || "";
            const aMonth = monthMap[aText] || 0;
            const bMonth = monthMap[bText] || 0;
            return isAsc ? aMonth - bMonth : bMonth - aMonth;
        });

        tbody.innerHTML = "";
        rows.forEach((row, i) => {
            row.querySelector("td:first-child").textContent = i + 1; // cập nhật STT
            tbody.appendChild(row);
        });
    }
    // ==============================
    // 11. Xuất Excel toàn bộ dữ liệu
    // ==============================
    document.getElementById("exportExcel")?.addEventListener("click", function () {
        const tbody = document.getElementById("dotLaoDongTableBody");
        const rows = tbody.querySelectorAll("tr");

        if (!rows || rows.length === 0 || rows[0].classList.contains("no-data-row")) {
            showToast("Không có dữ liệu để xuất!", "warning");
            return;
        }

        let html = `
        <meta charset="UTF-8">
        <style>
            table { font-family: 'Times New Roman'; font-size:14px; border-collapse:collapse; text-align:center; }
            th, td { padding:6px; vertical-align:middle; }
        </style>
        <table border="1">
            <thead>
                <tr>
                    <th>STT</th>
                    <th>Tên Đợt</th>
                    <th>Buổi</th>
                    <th>Loại LĐ</th>
                    <th>Giá trị</th>
                    <th>Ngày LĐ</th>
                    <th>Khu vực</th>
                    <th>Đăng ký/Quy định</th>
                    <th>Trạng thái</th>
                    <th>Ghi chú</th>
                </tr>
            </thead>
            <tbody>
    `;

        rows.forEach((row, i) => {
            const cells = row.querySelectorAll("td");
            if (cells.length < 10) return;

            html += `<tr>
            <td>${cells[0].textContent.trim()}</td>
            <td>${cells[1].textContent.trim()}</td>
            <td>${cells[2].textContent.trim()}</td>
            <td>${cells[3].textContent.trim()}</td>
            <td>${cells[4].textContent.trim()}</td>
            <td>${cells[5].textContent.trim()}</td>
            <td>${cells[6].textContent.trim()}</td>
            <td>${cells[7].textContent.trim()}</td>
            <td>${cells[8].textContent.trim()}</td>
            <td>${cells[9]?.textContent.trim() || ""}</td>
        </tr>`;
        });

        html += `</tbody></table>`;

        const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `DotLaoDong_HienThi_${new Date().toISOString().slice(0, 10)}.xls`;
        a.click();
        URL.revokeObjectURL(url);

        showToast("Xuất Excel thành công!", "success");
    });




});
