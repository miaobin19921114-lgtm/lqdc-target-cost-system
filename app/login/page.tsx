export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form action="/api/auth/login" method="post" className="w-full max-w-md bg-white rounded-2xl shadow-sm border p-8 space-y-4">
        <h1 className="text-2xl font-bold">登录</h1>
        <p className="text-sm text-gray-500">默认账号：admin@lqdc.local / admin123456</p>
        <label className="block space-y-1">
          <span className="text-sm">邮箱</span>
          <input name="email" type="email" defaultValue="admin@lqdc.local" className="w-full" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm">密码</span>
          <input name="password" type="password" defaultValue="admin123456" className="w-full" />
        </label>
        <button className="w-full rounded-lg bg-brand text-white py-3">登录</button>
      </form>
    </main>
  );
}
