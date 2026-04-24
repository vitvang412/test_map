using Microsoft.EntityFrameworkCore;
using DaNangSafeMap.Models.Entities;

namespace DaNangSafeMap.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        // ── Bảng Users (đã có) ──
        public DbSet<User> Users { get; set; }

        // ── Bảng Alert (MỚI) ──
        public DbSet<AlertCategory> AlertCategories { get; set; }
        public DbSet<AlertType> AlertTypes { get; set; }
        public DbSet<SecurityAlert> SecurityAlerts { get; set; }
        public DbSet<AlertMedia> AlertMedia { get; set; }
        public DbSet<AlertVerification> AlertVerifications { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ════════════════════════════════════════════
            // USER (giữ nguyên config cũ)
            // ════════════════════════════════════════════
            modelBuilder.Entity<User>(entity =>
            {
                // Unique constraints
                entity.HasIndex(e => e.Email).IsUnique();
                entity.HasIndex(e => e.GoogleId).IsUnique();

                // Default values
                entity.Property(e => e.CreatedAt)
                      .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(e => e.Role)
                      .HasDefaultValue("User");

                entity.Property(e => e.AuthProvider)
                      .HasDefaultValue("Local");

                entity.Property(e => e.IsActive)
                      .HasDefaultValue(true);

                entity.Property(e => e.ReputationScore)
                      .HasDefaultValue(5);
            });

            // ════════════════════════════════════════════
            // ALERT CATEGORY
            // ════════════════════════════════════════════
            modelBuilder.Entity<AlertCategory>(entity =>
            {
                entity.HasIndex(e => e.Slug).IsUnique();

                entity.Property(e => e.CreatedAt)
                      .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(e => e.IsActive)
                      .HasDefaultValue(true);

                // 1 Category → nhiều AlertType
                entity.HasMany(e => e.AlertTypes)
                      .WithOne(t => t.Category)
                      .HasForeignKey(t => t.CategoryId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // ════════════════════════════════════════════
            // ALERT TYPE
            // ════════════════════════════════════════════
            modelBuilder.Entity<AlertType>(entity =>
            {
                entity.HasIndex(e => e.Slug).IsUnique();

                entity.Property(e => e.CreatedAt)
                      .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(e => e.IsActive)
                      .HasDefaultValue(true);

                // 1 AlertType → nhiều SecurityAlert
                entity.HasMany(e => e.SecurityAlerts)
                      .WithOne(a => a.AlertType)
                      .HasForeignKey(a => a.AlertTypeId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // ════════════════════════════════════════════
            // SECURITY ALERT (bảng chính)
            // ════════════════════════════════════════════
            modelBuilder.Entity<SecurityAlert>(entity =>
            {
                // Default values
                entity.Property(e => e.Status)
                      .HasDefaultValue("PENDING_REVIEW");

                entity.Property(e => e.TrustScore)
                      .HasDefaultValue(0);

                entity.Property(e => e.ConfirmCount)
                      .HasDefaultValue(0);

                entity.Property(e => e.DenyCount)
                      .HasDefaultValue(0);

                entity.Property(e => e.Opacity)
                      .HasDefaultValue(30);

                entity.Property(e => e.HasMedia)
                      .HasDefaultValue(false);

                entity.Property(e => e.UserConfirmed)
                      .HasDefaultValue(false);

                entity.Property(e => e.CreatedAt)
                      .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(e => e.UpdatedAt)
                      .HasDefaultValueSql("CURRENT_TIMESTAMP");

                // FK → User
                entity.HasOne(e => e.User)
                      .WithMany(u => u.SecurityAlerts)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Restrict);

                // 1 Alert → nhiều Media
                entity.HasMany(e => e.Media)
                      .WithOne(m => m.Alert)
                      .HasForeignKey(m => m.AlertId)
                      .OnDelete(DeleteBehavior.Cascade);

                // 1 Alert → nhiều Verification
                entity.HasMany(e => e.Verifications)
                      .WithOne(v => v.Alert)
                      .HasForeignKey(v => v.AlertId)
                      .OnDelete(DeleteBehavior.Cascade);

                // Indexes tối ưu cho bản đồ
                entity.HasIndex(e => new { e.Latitude, e.Longitude });
                entity.HasIndex(e => new { e.Status, e.CreatedAt });
                entity.HasIndex(e => e.IncidentTime);
                entity.HasIndex(e => e.ExpiresAt);
            });

            // ════════════════════════════════════════════
            // ALERT MEDIA
            // ════════════════════════════════════════════
            modelBuilder.Entity<AlertMedia>(entity =>
            {
                entity.Property(e => e.MediaType)
                      .HasDefaultValue("IMAGE");

                entity.Property(e => e.SourceType)
                      .HasDefaultValue("ORIGINAL");

                entity.Property(e => e.IsActive)
                      .HasDefaultValue(true);

                entity.Property(e => e.CreatedAt)
                      .HasDefaultValueSql("CURRENT_TIMESTAMP");

                // FK → User
                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Restrict);

                // Index
                entity.HasIndex(e => e.AlertId);
            });

            // ════════════════════════════════════════════
            // ALERT VERIFICATION
            // ════════════════════════════════════════════
            modelBuilder.Entity<AlertVerification>(entity =>
            {
                // UNIQUE: mỗi user chỉ xác nhận 1 lần / alert
                entity.HasIndex(e => new { e.AlertId, e.UserId }).IsUnique();

                entity.Property(e => e.CreatedAt)
                      .HasDefaultValueSql("CURRENT_TIMESTAMP");

                // FK → User
                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Restrict);

                // Index
                entity.HasIndex(e => new { e.AlertId, e.VerificationType });
            });
        }
    }
}
