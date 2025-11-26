using QuanLyDangKyNgayLD.Models;

namespace QuanLyDangKyNgayLD.Factories   // đổi namespace cho rõ nghĩa
{
   
    public static class DbContextFactory
    {
   
        public static DB_QLNLD4ROLEEntities1 Create()
        {
            return new DB_QLNLD4ROLEEntities1();
        }
    }
}
