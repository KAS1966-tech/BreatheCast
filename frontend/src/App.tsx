import { Route, Routes } from "react-router-dom"
import Signup from "./pages/Signup"
import Login from "./pages/Login"
import PublicRoute from "./components/PublicRoute"
import Home from "./components/Home"
import ProtectedRoute from "./components/ProtectedRoute"
import { useEffect, useState } from "react"
import { waitForBackend } from "./api/predictionApi"
import { useAppDispatch } from "./app/redux"
import { fetchCurrentUser } from "./app/features/auth/authSlice"


const App = () => {
  const dispatch = useAppDispatch();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const initialize = async () => {
      try {
        await waitForBackend();
        await dispatch(fetchCurrentUser()).unwrap();
      } finally {
        setReady(true);
      }
    };

    initialize();
  }, [dispatch]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/" element={<Signup />} />
          <Route path="/login" element={<Login />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<Home />} />
        </Route>
      </Routes>
    </div>
  )
}

export default App
