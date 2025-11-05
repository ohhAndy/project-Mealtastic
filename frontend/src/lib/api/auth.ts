const API = process.env.NEXT_PUBLIC_API_URL!;

export async function register(data: {
  name: string;
  email: string;
  password: string;
}) {
  console.log(`/api/auth/register`);
  try {
    const res = await fetch(`/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error(`Failed to register: ${res.status} ${res.statusText}`);
    }

    return res.json();

  } catch (error) {
    console.error("Error Registering:", error);
  }
}

export async function login(data: {
  email: string;
  password: string;
}) {
  try {
    const res = await fetch(`/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error(`Failed to login: ${res.status}`);
    }

    return res.json();
    
  } catch (error) {
    console.error("Error logging in:", error);
  }
}

export async function logout() {
  try {
    const res = await fetch(`/api/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error(`Failed to logout: ${res.status}`);
    }
    
  } catch (error) {
    console.error("Error logging out:", error);
  }
}

export async function getProfile() {
  try {
    const res = await fetch(`/api/auth/profile`, {
      method: "GET",
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error(`Failed to get user profile: ${res.status}`);
    }
    
    return res.json();
  } catch (error) {
    console.error("Error fetching user data:", error);
  }
}


export function googleLogin() {
    window.location.href = `/api/auth/google`;
}