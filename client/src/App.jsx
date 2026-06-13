import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import AppFooter from "./components/AppFooter.jsx";
import AppNavbar from "./components/AppNavbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { UserProvider } from "./contexts/UserContext.js";
import ExecutionPage from "./pages/ExecutionPage.jsx";
import InstructionsPage from "./pages/InstructionsPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import PlanningPage from "./pages/PlanningPage.jsx";
import RankingPage from "./pages/RankingPage.jsx";
import ResultPage from "./pages/ResultPage.jsx";
import SetupPage from "./pages/SetupPage.jsx";

// Defines the SPA route table and wraps protected routes in session guards.
function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <AppNavbar />
        <main>
          <div className="app-content">
            <Routes>
              <Route path="/" element={<InstructionsPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/setup"
                element={
                  <ProtectedRoute>
                    <SetupPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/planning/:gameId"
                element={
                  <ProtectedRoute>
                    <PlanningPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/execution/:gameId"
                element={
                  <ProtectedRoute>
                    <ExecutionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/result/:gameId"
                element={
                  <ProtectedRoute>
                    <ResultPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ranking"
                element={
                  <ProtectedRoute>
                    <RankingPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
        <AppFooter />
      </UserProvider>
    </BrowserRouter>
  );
}

export default App;
