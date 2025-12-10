document.getElementById("exportAllAccountstudent").addEventListener("click", function () {
    const keywordInput = document.getElementById("searchInput");
    const keyword = keywordInput ? keywordInput.value.trim() : "";

    fetch(`/Admin/AdminStudent/ExportAllStudentsToExcel?keyword=${encodeURIComponent(keyword)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Xuất Excel thất bại. HTTP ${response.status}`);
            }
            return response.blob(); // nhận file dạng blob
        })
        .then(blob => {
            // Tạo link download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `DanhSachSinhVien_${new Date().toISOString().replace(/[-:.]/g, "")}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            // ✅ Thành công
            showToast("Xuất Excel thành công!", "success");
        })
        .catch(err => {
            // ❌ Thất bại
            console.error("Lỗi xuất Excel:", err);
            showToast("Xuất Excel thất bại: " + err.message, "error");
        });
});
