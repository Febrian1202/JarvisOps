<?php

namespace App\Http\Resources\User;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserAdminResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->full_name,
            'email' => $this->email,
            'status' => $this->status,
            'must_change_password' => (bool) $this->must_change_password,
            'role' => $this->whenLoaded('role', fn () => [
                'id' => $this->role->id,
                'name' => $this->role->name,
            ]),
            'department' => $this->whenLoaded('department', fn () => $this->department ? [
                'id' => $this->department->id,
                'name' => $this->department->name,
            ] : null),
            'profile' => $this->whenLoaded('employeeProfile', fn () => $this->employeeProfile ? [
                'employee_code' => $this->employeeProfile->employee_code,
                'phone' => $this->employeeProfile->phone,
                'position' => $this->employeeProfile->position,
                'hire_date' => $this->employeeProfile->hire_date?->format('Y-m-d'),
            ] : null),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
