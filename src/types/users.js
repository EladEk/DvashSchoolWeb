// User types and roles
export const UserRole = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
  KIOSK: 'kiosk',
}

export const AppUser = {
  id: String,
  username: String,
  usernameLower: String,
  firstName: String,
  lastName: String,
  role: String, // 'admin' | 'teacher' | 'student' | 'kiosk'
  birthday: String, // YYYY-MM-DD
  classId: String, // א..יב
  passwordHash: String,
  createdAt: Date,
  email: String,
  uid: String,
}
