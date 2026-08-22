import { Route, Routes } from "react-router-dom"
import Signup from "./pages/Signup"
import Login from "./pages/Login"
import PublicRoute from "./components/PublicRoute"
import Home from "./components/Home"
import ProtectedRoute from "./components/ProtectedRoute"
import { useEffect, useState } from "react"
import { waitForBackend } from "./api/predictionApi"
import { useAppDispatch, useAppSelector } from "./app/redux"
import { fetchCurrentUser } from "./app/features/auth/authSlice"
import AqiPrediction from "./pages/AqiPrediction"
import Loading from "./components/Loading"
import FileUpload from "./pages/FileUpload"
import NotFound from "./components/NotFound"
import { setTheme as syncDOMTheme } from "./utils/theme.utlis";
import IntroPage from "./pages/IntroPage"
import History from "./pages/History"


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

  const themeMode = useAppSelector((state) => state.theme.mode);

  // 2. Automatically update the DOM whenever themeMode changes
  useEffect(() => {
    syncDOMTheme(themeMode);
  }, [themeMode]);

  if (!ready) {
    console.log("wow");
    return <Loading />
  }

  return (
    <div>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/" element={<IntroPage />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<Home />} />
          <Route path="/predict" element={<AqiPrediction />} />
          <Route path="/fileupload" element={<FileUpload />} />
          <Route path="/history" element={<History />} />
        </Route>
          <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  )
}

export default App
