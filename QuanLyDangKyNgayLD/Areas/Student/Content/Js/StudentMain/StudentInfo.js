document.getElementById("btnSave").addEventListener("click", function () {
    const formData = new FormData();
    formData.append("MSSV", document.getElementById("mssv").value.trim());
    formData.append("HoTen", document.getElementById("hoten").value.trim());
    formData.append("Email", document.getElementById("email").value.trim());
    formData.append("NgaySinh", document.getElementById("ngaysinh").value);
    formData.append("QueQuan", document.getElementById("quequan").value.trim());
    formData.append("GioiTinh", document.getElementById("gioitinh").value);
    formData.append("SoDienThoaiSinhVien", document.getElementById("sdt").value.trim());

    const avatarFile = document.getElementById("avatarFile").files[0];
    if (avatarFile) {
        formData.append("AvatarFile", avatarFile);
    }

    formData.append("__RequestVerificationToken", document.querySelector('input[name="__RequestVerificationToken"]').value);

    fetch("/Student/MainSinhVien/UpdateInfo", {
        method: "POST",
        body: formData
    })
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                showToast(res.message, "success");
                refreshStudentInfo(); // gọi lại API để cập nhật card
            } else {
                showToast(res.message, "error");
            }
        })
        .catch(() => showToast("Lỗi kết nối đến server!", "error"));
});

// Hàm refresh lại card thông tin sinh viên
function refreshStudentInfo() {
    fetch("/Student/MainSinhVien/GetStudentInfo")
        .then(r => r.json())
        .then(info => {
            if (info.success) {
                document.getElementById("mssv").textContent = info.data.MSSV || "Chưa có dữ liệu";
                document.getElementById("hoten").textContent = info.data.HoTen || "Chưa có dữ liệu";
                document.getElementById("email").textContent = info.data.Email || "Chưa có dữ liệu";
                document.getElementById("gioitinh").textContent = info.data.GioiTinh || "Chưa có dữ liệu";
                document.getElementById("sdt").textContent = info.data.SoDienThoai || "Chưa có dữ liệu";
                document.getElementById("lop").textContent = info.data.Lop || "Chưa có dữ liệu";
                document.getElementById("vaitro").textContent = info.data.VaiTro || "Chưa có";
                document.getElementById("avatarImg").src = info.data.Avatar;
            } else {
                showToast(info.message, "error");
            }
        })
        .catch(() => showToast("Không thể tải lại thông tin sinh viên!", "error"));
}
