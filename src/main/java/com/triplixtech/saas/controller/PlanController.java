package com.triplixtech.saas.controller;

import com.triplixtech.saas.entity.Plan;
import com.triplixtech.saas.service.PlanService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/plans")
public class PlanController {

    @Autowired
    private PlanService planService;

    @PostMapping
    public Plan create(@RequestBody Plan plan){
        return planService.savePlan(plan);
    }

    @GetMapping
    public List<Plan> getAll(){
        return planService.getAllPlans();
    }

    @GetMapping("/{id}")
    public Plan getById(@PathVariable Long id){
        return planService.getById(id);
    }
}