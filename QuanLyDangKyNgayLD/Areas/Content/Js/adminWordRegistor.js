// Quản lý Đợt Lao Động - Full JS
document.addEventListener("DOMContentLoaded", function () {
    let currentPage = 1;
    const pageSize = 5;

    // ==============================
    // 1) Tải dữ liệu lần đầu
    // ==============================
    loadDataToTable();

    // ==============================
    // 2) Hàm load dữ liệu + loading
    // ==============================
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
        tbody.innerHTML = items.map((item, index) => `
            <tr data-id="${item.TaoDotLaoDong_id}">
                <td>${(page - 1) * pageSize + index + 1}</td>
                <td>${item.DotLaoDong}</td>
                <td>${item.Buoi}</td>
                <td>${item.LoaiLaoDong || ""}</td>
                <td class="text-success fw-bold">${item.GiaTri ?? ""}</td>
                <td>${item.NgayLaoDong || ""}</td>
                <td>${item.KhuVuc || ""}</td>
                <td>${item.SoLuongSinhVien ?? ""}</td>
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
        `).join("");

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

    document.getElementById("btnViewDeleted")?.addEventListener("click", function () {
        const body = document.getElementById("deletedTableBody");
        body.innerHTML = `<tr><td colspan="7" class="text-center"><div class="spinner"></div> Đang tải...</td></tr>`;

        fetch("/Admin/AdminWordRegister/GetDeletedDotLaoDong")
            .then(res => res.json())
            .then(data => {
                if (!data.items || data.items.length === 0) {
                    body.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Không có dữ liệu</td></tr>`;
                } else {
                    body.innerHTML = data.items.map((x, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${x.DotLaoDong}</td>
                            <td>${x.Buoi}</td>
                            <td>${x.NgayLaoDong}</td>
                            <td>${x.KhuVuc}</td>
                            <td>${x.Ngayxoa}</td>
                            <td>
                                <button class="btn btn-sm btn-success btn-restore" data-id="${x.TaoDotLaoDong_id}">
                                    Khôi phục
                                </button>
                            </td>
                        </tr>
                    `).join("");
                }
                new bootstrap.Modal(document.getElementById("deletedModal")).show();
            })
            .catch(() => {
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
            document.getElementById("detailSoLuongSinhVien").textContent = cells[7]?.textContent || "";
            document.getElementById("detailTrangThaiDuyet").textContent = tr.querySelector(".badge")?.textContent || "";
            new bootstrap.Modal(document.getElementById("detailModal")).show();
        }

        // Sửa
        if (editBtn) {
            const tr = editBtn.closest("tr");
            const cells = tr.querySelectorAll("td");
            document.getElementById("editId").value = editBtn.dataset.id;
            document.getElementById("editDotLaoDong").value = cells[1]?.textContent || "";
            document.getElementById("editBuoi").value = cells[2]?.textContent || "Sáng";
            document.getElementById("editLoaiLaoDong").value = cells[3]?.textContent || "";
            document.getElementById("editGiaTri").value = (cells[4]?.textContent || "").replace(/\D/g, "");
            document.getElementById("editKhuVuc").value = cells[6]?.textContent || "";
            document.getElementById("editSoLuongSinhVien").value = cells[7]?.textContent || "";
            document.getElementById("editMoTa").value = "";
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
            if (!confirm("Duyệt đợt lao động này?")) return;
            fetch(`/Admin/AdminWordRegister/ApproveAjax?id=${id}`, { method: "POST" })
                .then(res => res.json())
                .then(data => {
                    alert(data.message || (data.success ? "Đã duyệt" : "Duyệt thất bại"));
                    loadDataToTable(currentPage);
                })
                .catch(() => alert("Lỗi kết nối!"));
        }

        // Khôi phục
        if (restoreBtn) {
            const id = restoreBtn.dataset.id;
            if (!confirm("Khôi phục đợt này?")) return;
            fetch(`/Admin/AdminWordRegister/RestoreAjax?id=${id}`, { method: "POST" })
                .then(res => res.json())
                .then(data => {
                    alert(data.message || (data.success ? "Đã khôi phục" : "Khôi phục thất bại"));
                    document.getElementById("btnViewDeleted").click();
                    loadDataToTable(currentPage);
                })
                .catch(() => alert("Lỗi kết nối!"));
        }
    });

    // ==============================
    // 7) Submit form AJAX: Create, Edit, Delete
    // ==============================
    document.getElementById("createForm")?.addEventListener("submit", function (e) {
        e.preventDefault();

        const formData = new FormData(this);
        // token được tạo tự động bởi @Html.AntiForgeryToken() trong form, không cần append thủ công
        // const token = this.querySelector('input[name="__RequestVerificationToken"]')?.value;
        // formData.append("__RequestVerificationToken", token);

        fetch(this.action, { method: "POST", body: formData })
            .then((res) => {
                console.log("Status:", res.status);
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
                    alert(data.message || "Tạo đợt thành công!");
                    loadDataToTable(currentPage);
                } else {
                    alert(data.message || "Tạo thất bại!");
                }
            })
            .catch((err) => {
                console.error("Lỗi:", err);
                alert("Lỗi kết nối hoặc server không phản hồi.");
            });
    });

    document.getElementById("editForm")?.addEventListener("submit", function (e) {
        e.preventDefault();
        const formData = new FormData(this);
        fetch(this.action, { method: "POST", body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    bootstrap.Modal.getInstance(document.getElementById("editModal")).hide();
                    alert(data.message || "Cập nhật thành công!");
                    loadDataToTable(currentPage);
                } else {
                    alert(data.message || "Cập nhật thất bại!");
                }
            })
            .catch(() => alert("Lỗi kết nối!"));
    });

    document.getElementById("confirmDeleteBtn")?.addEventListener("click", function () {
        const id = this.dataset.id;
        fetch(`/Admin/AdminWordRegister/DeleteAjax?id=${id}`, { method: "POST" })
            .then(res => res.json())
            .then(data => {
                bootstrap.Modal.getInstance(document.getElementById("deleteModal")).hide();
                alert(data.message || (data.success ? "Đã xóa" : "Xóa thất bại"));
                loadDataToTable(currentPage);
            })
            .catch(() => alert("Lỗi kết nối!"));
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
});
