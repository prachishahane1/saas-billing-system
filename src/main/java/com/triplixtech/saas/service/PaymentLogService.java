package com.triplixtech.saas.service;

import com.triplixtech.saas.entity.PaymentLog;
import com.triplixtech.saas.repository.PaymentLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PaymentLogService {

    @Autowired
    private PaymentLogRepository paymentLogRepository;

    public PaymentLog saveLog(PaymentLog log){
        return paymentLogRepository.save(log);
    }

    public List<PaymentLog> getAll(){
        return paymentLogRepository.findAll();
    }

    public List<PaymentLog> getByPayment(Long paymentId){
        return paymentLogRepository.findByPayment_PaymentId(paymentId);
    }
}