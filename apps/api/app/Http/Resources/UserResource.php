<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'email' => $this->email,
            'full_name' => $this->full_name,
            'status' => $this->status,
            'role' => $this->whenLoaded('role', fn () => $this->role->only('id', 'name')),
            'department' => $this->whenLoaded('department', fn () => $this->department->only('id', 'name')),
            'profile' => $this->whenLoaded('employeeProfile', fn () => $this->employeeProfile->only('employee_code', 'position', 'phone')),
        ];
    }
}
