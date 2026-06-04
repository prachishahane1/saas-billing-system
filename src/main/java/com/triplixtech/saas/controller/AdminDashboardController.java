package com.triplixtech.saas.controller;

import com.triplixtech.saas.dto.AdminDashboardMetrics;
import com.triplixtech.saas.service.AdminDashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/dashboard")
public class AdminDashboardController {

    @Autowired
    private AdminDashboardService adminDashboardService;

    @GetMapping("/metrics")
    public ResponseEntity<AdminDashboardMetrics> getMetrics() {
        return ResponseEntity.ok(adminDashboardService.getMetrics());
    }
}
