import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../app/store";

const ProtectedRoute = () => {
    const {isAuthenticated} = useSelector((state: RootState) => state.auth);
    return !isAuthenticated ? <Navigate to="/login" replace /> : <Outlet />;
};

export default ProtectedRoute;