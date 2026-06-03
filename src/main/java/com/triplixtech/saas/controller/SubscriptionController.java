package com.triplixtech.saas.controller;

import com.triplixtech.saas.entity.Subscription;
import com.triplixtech.saas.service.SubscriptionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/subscriptions")
public class SubscriptionController {

    @Autowired
    private SubscriptionService subscriptionService;

    @PostMapping
    public Subscription create(@RequestBody Subscription subscription){
        return subscriptionService.saveSubscription(subscription);
    }

    @GetMapping
    public List<Subscription> getAll(){
        return subscriptionService.getAll();
    }

    @GetMapping("/{id}")
    public Subscription getById(@PathVariable Long id){
        return subscriptionService.getById(id);
    }

    @GetMapping("/organization/{orgId}")
    public List<Subscription> getByOrganization(@PathVariable Long orgId){
        return subscriptionService.getByOrganization(orgId);
    }
}