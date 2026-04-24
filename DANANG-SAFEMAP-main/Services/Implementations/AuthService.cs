using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Google.Apis.Auth;
using Microsoft.IdentityModel.Tokens;
using BCrypt.Net;
using DaNangSafeMap.Models.Entities;
using DaNangSafeMap.Models.ViewModels.Auth;
using DaNangSafeMap.Repositories;
using DaNangSafeMap.Services.Interfaces;

namespace DaNangSafeMap.Services.Implementations
{
    /// <summary>
    /// Xử lý toàn bộ logic xác thực: đăng ký, đăng nhập, Google OAuth, tạo JWT.
    /// </summary>
    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly IConfiguration _configuration;

        public AuthService(IUserRepository userRepository, IConfiguration configuration)
        {
            _userRepository = userRepository;
            _configuration = configuration;
        }

        // ─── ĐĂNG KÝ ────────────────────────────────────────────────────────────
        public async Task<AuthResponse> RegisterAsync(RegisterViewModel model)
        {
            // 1. Kiểm tra email đã tồn tại chưa
            if (await _userRepository.EmailExistsAsync(model.Email))
            {
                return new AuthResponse
                {
                    Success = false,
                    Message = "Email này đã được sử dụng"
                };
            }

            // 2. Hash password bằng BCrypt (không lưu password gốc)
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(model.Password);

            // 3. Tạo user mới
            var user = new User
            {
                FullName = model.FullName,
                DateOfBirth = model.DateOfBirth,
                Gender = model.Gender,
                Address = model.Address,
                Email = model.Email,
                PasswordHash = passwordHash,
                AuthProvider = "Local",
                Role = "User",
                IsActive = true,
                CreatedAt = DateTime.Now
            };

            // 4. Lưu vào database
            await _userRepository.CreateAsync(user);

            // 5. Tạo JWT token và trả về
            var token = GenerateJwtToken(user);
            return new AuthResponse
            {
                Success = true,
                Message = "Đăng ký thành công",
                Token = token,
                User = MapToDto(user)
            };
        }

        // ─── ĐĂNG NHẬP ──────────────────────────────────────────────────────────
        public async Task<AuthResponse> LoginAsync(LoginViewModel model)
        {
            // 1. Tìm user theo email
            var user = await _userRepository.GetByEmailAsync(model.Email);
            if (user == null)
            {
                return new AuthResponse { Success = false, Message = "Email hoặc mật khẩu không đúng" };
            }

            // 2. Kiểm tra tài khoản có bị khóa không
            if (!user.IsActive)
            {
                return new AuthResponse { Success = false, Message = "Tài khoản đã bị khóa" };
            }

            // 3. Kiểm tra user này có dùng Google login không (không có password)
            if (user.AuthProvider == "Google")
            {
                return new AuthResponse { Success = false, Message = "Tài khoản này đăng nhập bằng Google" };
            }

            // 4. Verify password bằng BCrypt
            if (!BCrypt.Net.BCrypt.Verify(model.Password, user.PasswordHash))
            {
                return new AuthResponse { Success = false, Message = "Email hoặc mật khẩu không đúng" };
            }

            // 5. Cập nhật thời gian đăng nhập cuối
            user.LastLoginAt = DateTime.Now;
            await _userRepository.UpdateAsync(user);

            // 6. Tạo JWT token và trả về
            var token = GenerateJwtToken(user);
            return new AuthResponse
            {
                Success = true,
                Message = "Đăng nhập thành công",
                Token = token,
                User = MapToDto(user)
            };
        }

        // ─── ĐĂNG NHẬP GOOGLE ───────────────────────────────────────────────────
        public async Task<AuthResponse> GoogleLoginAsync(string idToken)
        {
            try
            {
                // 1. Xác thực ID Token với Google (kiểm tra token có thật không)
                var settings = new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = new[] { _configuration["Google:ClientId"] }
                };
                var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);

                // 2. Tìm user theo GoogleId
                var user = await _userRepository.GetByGoogleIdAsync(payload.Subject);

                if (user == null)
                {
                    // 3a. Chưa có tài khoản → tạo mới tự động
                    // Kiểm tra email đã tồn tại chưa (có thể đã đăng ký bằng email)
                    user = await _userRepository.GetByEmailAsync(payload.Email);

                    if (user != null)
                    {
                        // Email đã tồn tại → liên kết với Google
                        user.GoogleId = payload.Subject;
                        user.AuthProvider = "Google";
                        await _userRepository.UpdateAsync(user);
                    }
                    else
                    {
                        // Tạo tài khoản mới từ thông tin Google
                        user = new User
                        {
                            FullName = payload.Name,
                            Email = payload.Email,
                            GoogleId = payload.Subject,
                            Avatar = payload.Picture,
                            AuthProvider = "Google",
                            Role = "User",
                            IsActive = true,
                            CreatedAt = DateTime.Now
                        };
                        await _userRepository.CreateAsync(user);
                    }
                }

                // 3b. Đã có tài khoản → cập nhật LastLoginAt
                user.LastLoginAt = DateTime.Now;
                await _userRepository.UpdateAsync(user);

                // 4. Tạo JWT token và trả về
                var token = GenerateJwtToken(user);
                return new AuthResponse
                {
                    Success = true,
                    Message = "Đăng nhập Google thành công",
                    Token = token,
                    User = MapToDto(user)
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine("GOOGLE LOGIN ERROR: " + ex.Message);
                if (ex.InnerException != null) Console.WriteLine("INNER: " + ex.InnerException.Message);
                return new AuthResponse { Success = false, Message = "Lỗi hệ thống: " + ex.Message };
            }
        }

        // ─── TẠO JWT TOKEN ───────────────────────────────────────────────────────
        public string GenerateJwtToken(User user)
        {
            // Claims: thông tin được mã hóa trong token
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.FullName),
                new Claim(ClaimTypes.Role, user.Role)
            };

            // Lấy secret key từ appsettings.json
            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            // Tạo token với thời hạn từ config
            var expireMinutes = int.Parse(_configuration["Jwt:ExpireMinutes"] ?? "60");
            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddMinutes(expireMinutes),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        // ─── HELPER ─────────────────────────────────────────────────────────────
        // Chuyển User entity sang UserDto (không trả PasswordHash về frontend)
        private static UserDto MapToDto(User user) => new UserDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Avatar = user.Avatar,
            Role = user.Role,
            AuthProvider = user.AuthProvider
        };
    }
}
