<?php

namespace App\Http\Middleware;

use App\Models\ActivityLog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ActivityLogMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Only log for authenticated users and specific methods
        if (auth()->check() && in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'])) {
            $this->logActivity($request, $response);
        }

        return $response;
    }

    private function logActivity(Request $request, Response $response)
    {
        // Skip logging for certain routes
        $skipRoutes = [
            'logout',
            'password.update',
            'profile.update',
        ];

        if (in_array($request->route()?->getName(), $skipRoutes)) {
            return;
        }

        $action = $this->getActionFromRequest($request);

        if ($action) {
            ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => $action,
                'model_type' => $this->getModelTypeFromRoute($request),
                'model_id' => $this->getModelIdFromRoute($request),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'description' => $this->getDescriptionFromRequest($request),
            ]);
        }
    }

    private function getActionFromRequest(Request $request): ?string
    {
        $method = $request->method();
        $routeName = $request->route()?->getName();

        return match ($method) {
            'POST' => 'created',
            'PUT', 'PATCH' => 'updated',
            'DELETE' => 'deleted',
            default => null,
        };
    }

    private function getModelTypeFromRoute(Request $request): ?string
    {
        $routeName = $request->route()?->getName();

        if (str_contains($routeName, 'transaction')) return 'Transaction';
        if (str_contains($routeName, 'apartment')) return 'Apartment';
        if (str_contains($routeName, 'customer-service')) return 'CustomerService';
        if (str_contains($routeName, 'user')) return 'User';
        if (str_contains($routeName, 'config')) return 'BotConfig';

        return null;
    }

    private function getModelIdFromRoute(Request $request): ?int
    {
        $route = $request->route();

        // Try to get ID from route parameters
        foreach (['id', 'transaction', 'apartment', 'user', 'config'] as $param) {
            if ($route && $route->hasParameter($param)) {
                return $route->parameter($param);
            }
        }

        return null;
    }

    private function getDescriptionFromRequest(Request $request): string
    {
        $action = $this->getActionFromRequest($request);
        $model = $this->getModelTypeFromRoute($request);
        $routeName = $request->route()?->getName();

        return "{$action} {$model} via {$routeName}";
    }
}
