import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ProductsPage from "./pages/ProductsPage";
import PrivateOAuthCallbackPage from "./pages/PrivateOAuthCallbackPage";
import PrivateDashboardPage from "./pages/PrivateDashboardPage";
import PrivateSignInPage from "./pages/PrivateSignInPage";
import PublicLandingPage from "./pages/PublicLandingPage";
import SuitePage from "./pages/SuitePage";
import VerifyPage from "./pages/VerifyPage";

const routes = ["/clarity", "/ged-tutor", "/hidden-gems", "/pd-pro", "/pd-pro/office", "/recidivism", "/task-force-pro", "/recidivism/triggers", "/recidivism/patterns", "/recidivism/obligations", "/recidivism/geofences", "/recidivism/contacts", "/recidivism/subjects/:id", "/recidivism/reports/:id", "/recidivism/console", "/sitrep", "/pam", "/account", "/admin"];
const betaAuthBypass = import.meta.env.VITE_XINUS_BETA_AUTH_BYPASS !== "false";

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="dark" switchable><TooltipProvider><Toaster theme="dark" /><Switch><Route path="/verify" component={VerifyPage}/><Route path="/" component={betaAuthBypass ? BetaDashboardRedirect : PublicLandingPage}/><Route path="/private-sign-in" component={betaAuthBypass ? BetaDashboardRedirect : PrivateSignInPage}/><Route path="/private-oauth/callback" component={PrivateOAuthCallbackPage}/><Route path="/wraith"><Redirect to="/pam" /></Route><Route><DashboardLayout><Switch><Route path="/dashboard" component={PrivateDashboardPage}/><Route path="/products" component={ProductsPage} />{routes.map(path => <Route key={path} path={path} component={SuitePage} />)}<Route component={SuitePage} /></Switch></DashboardLayout></Route></Switch></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

function BetaDashboardRedirect() {
  return <Redirect to="/dashboard" />;
}
