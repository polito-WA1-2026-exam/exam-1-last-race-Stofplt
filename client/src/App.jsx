import { Container } from "react-bootstrap";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import AppNavbar from "./components/AppNavbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { UserProvider } from "./contexts/UserContext.js";
import ExecutionPage from "./pages/ExecutionPage.jsx";
import InstructionsPage from "./pages/InstructionsPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import PlanningPage from "./pages/PlanningPage.jsx";
import RankingPage from "./pages/RankingPage.jsx";
import SetupPage from "./pages/SetupPage.jsx";

function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <AppNavbar />
        <main>
          <Container className="py-4">
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
                path="/ranking"
                element={
                  <ProtectedRoute>
                    <RankingPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Container>
        </main>
      </UserProvider>
    </BrowserRouter>
  );
}

export default App;
