import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../app/redux";


const PublicRoute = () => {
    const { isAuthenticated } = useAppSelector((state)=> state.auth);
    return !isAuthenticated ? <Outlet /> : <Navigate to="/home" replace />;
};

export default PublicRoute;