<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #fff;
        }
        .ticket-sheet {
            width: 100%;
            max-width: 900px;
            margin: 0 auto;
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: flex-start;
            height: 250px;
            padding-top: 38px;
        }
        .ticket-panel {
            flex: 1;
            min-width: 0;
            margin: 0;
            border: none;
            height: 100%;
            position: relative;
            display: flex;
            flex-direction: column;
            background: #fff;
        }
        .ticket-header {
            background: #0074c2;
            color: #fff;
            text-align: center;
            padding: 8px 0 4px 0;
            font-size: 18px;
            font-weight: bold;
            letter-spacing: 1px;
        }
        .ticket-subheader {
            background: #fff;
            color: #0074c2;
            text-align: center;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 6px;
        }
        .ticket-details {
            padding: 10px 16px 0 16px;
            font-size: 13px;
            color: #222;
        }
        .ticket-details .item {
            margin-bottom: 4px;
        }
        .ticket-details .label {
            font-weight: bold;
            color: #444;
        }
        .ticket-footer {
            margin-top: auto;
            background: #0074c2;
            color: #fff;
            text-align: center;
            font-size: 13px;
            font-weight: bold;
            padding: 5px 0;
            letter-spacing: 1px;
        }
        .ticket-copy-type {
            position: absolute;
            top: 0;
            left: 0;
            background: #0074c2;
            color: #fff;
            font-size: 11px;
            font-weight: bold;
            padding: 2px 10px;
            border-bottom-right-radius: 8px;
        }
        .branding-strip {
            position: absolute;
            left: 0;
            bottom: 0;
            width: 100%;
            background: #ffe600;
            color: #0074c2;
            font-size: 10px;
            text-align: center;
            padding: 2px 0;
            font-weight: bold;
        }
        @media print {
            body, html {
                background: #fff !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            .ticket-sheet {
                width: 100%;
                max-width: 900px;  
                height: 250px;     
                page-break-inside: avoid;
                margin: 0 !important;
            }
            @page {
                margin: 5mm;      
            }
        }
    </style>
</head>
<body>
    <?php 
        $copyTypes = [
            'Passenger Copy',
            'Guide Copy',
            'Counter Copy'
        ];
    ?>
    <div class="ticket-sheet">
        <?php foreach ($copyTypes as $i => $copyType): ?>
            <?php if ($i === 0): ?>
                <div class="ticket-panel" style="flex:2.2; border-right:1.5px solid #ccc;">
                    <div class="ticket-details" style="display: flex; flex-direction: column; justify-content: flex-start; height: 80%;">
                        <div style="display: flex; flex-direction: row; gap: 24px;">
                            <div style="flex:1; min-width: 0;">
                                <div class="item"><span class="label">Name:</span> <span><?php echo $ticket->last_name; ?></span></div>
                                <div class="item"><span class="label">Journey Date:</span> <span><?php echo date('d M Y', strtotime($ticket->created_at)); ?></span></div>
                                <div class="item"><span class="label">Departure time:</span> <span>
                                    <?php
                                    $departureTime = '--';
                                    if (isset($pickdrop) && is_array($pickdrop) && isset($ticket->drop_stand_id)) {
                                        foreach ($pickdrop as $pickvalue) {
                                            if (isset($pickvalue->pickdropid) && $pickvalue->pickdropid == $ticket->drop_stand_id) {
                                                $dropupTime = isset($pickvalue->time) ? $pickvalue->time : '';
                                                if ($dropupTime !== '') {
                                                    $dropupDateTime = DateTime::createFromFormat('h:i A', $dropupTime);
                                                    if ($dropupDateTime) {
                                                        $dropupDateTime->modify('+15 minutes');
                                                        $departureTime = $dropupDateTime->format('h:i A');
                                                    } else {
                                                        $departureTime = $dropupTime;
                                                    }
                                                }
                                                break;
                                            }
                                        }
                                    }
                                    echo $departureTime;
                                    ?>
                                </span></div>
                                <div class="item"><span class="label">Seat No:</span> <span><?php echo $ticket->seatnumber; ?></span></div>
                                                                <div class="item"><span class="label">Drop Location:</span> <span><?php echo $to; ?></span></div>

                                <div class="item"><span class="label">Mobile:</span> <span><?php echo $ticket->login_mobile; ?></span></div>
                            </div>
                            <div style="flex:1; min-width: 0;">
                                <div class="item"><span class="label">PNR:</span> <span><?php echo $ticket->pnr_no ?? "N/A"; ?></span></div>
                                <div class="item"><span class="label">Reporting time:</span> <span>
                                    <?php
                                    $reportingTime = '--';
                                    if (isset($pickdrop) && is_array($pickdrop) && isset($ticket->pick_stand_id)) {
                                        foreach ($pickdrop as $pickvalue) {
                                            if (isset($pickvalue->pickdropid) && $pickvalue->pickdropid == $ticket->pick_stand_id) {
                                                $pickupTime = isset($pickvalue->time) ? $pickvalue->time : '';
                                                if ($pickupTime !== '') {
                                                    $pickupDateTime = DateTime::createFromFormat('h:i A', $pickupTime);
                                                    if ($pickupDateTime) {
                                                        $pickupDateTime->modify('-15 minutes');
                                                        $reportingTime = $pickupDateTime->format('h:i A');
                                                    } else {
                                                        $reportingTime = $pickupTime;
                                                    }
                                                }
                                                break;
                                            }
                                        }
                                    }
                                    echo $reportingTime;
                                    ?>
                                </span></div>
                                <div class="item"><span class="label">Total Fare(Tk):</span> <span><?php echo number_format($ticket->paidamount, 2); ?></span></div>
                                <div class="item"><span class="label">Pick Up Location:</span> <span><?php echo $from; ?></span></div>

                                <div class="item"><span class="label">Issued On:</span> <span><?php echo date('d M Y h:iA', strtotime($ticket->created_at)); ?></span></div>
                            </div>
                        </div>
                    </div>
                    <div style="flex:1;"></div>
                    <div class="branding-strip" style="position: absolute; left: 0; bottom: 0; width: 100%; background: #ffe600; color: #0074c2; font-size: 12px; text-align: center; padding: 6px 0; font-weight: bold;">
                        ঘরে বসে অনলাইনে টিকেট কাটতে ভিজিট করুন www.naqilbd.com ওয়েবসাইটে।
                    </div>
                    <div class="ticket-footer"><?php echo $copyType; ?></div>
                </div>
            <?php else: ?>
                <div class="ticket-panel" style="flex:1; border-right:<?php echo $i==1?'1.5px solid #ccc':'none'; ?>;">
                    <div class="ticket-details">
                        <div class="item"><span class="label">Name:</span> <?php echo $ticket->last_name; ?></div>
                        <div class="item"><span class="label">PNR:</span> <?php echo $ticket->pnr_no ?? "N/A"; ?></div>
                        <div class="item"><span class="label">Journey Date:</span> <?php echo date('d M Y', strtotime($ticket->created_at)); ?></div>
                        <div class="item"><span class="label">Reporting time:</span> 
                            <?php
                            $reportingTime = '--';
                            if (isset($pickdrop) && is_array($pickdrop) && isset($ticket->pick_stand_id)) {
                                foreach ($pickdrop as $pickvalue) {
                                    if (isset($pickvalue->pickdropid) && $pickvalue->pickdropid == $ticket->pick_stand_id) {
                                        $pickupTime = isset($pickvalue->time) ? $pickvalue->time : '';
                                        if ($pickupTime !== '') {
                                            $pickupDateTime = DateTime::createFromFormat('h:i A', $pickupTime);
                                            if ($pickupDateTime) {
                                                $pickupDateTime->modify('-15 minutes');
                                                $reportingTime = $pickupDateTime->format('h:i A');
                                            } else {
                                                $reportingTime = $pickupTime;
                                            }
                                        }
                                        break;
                                    }
                                }
                            }
                            echo $reportingTime;
                            ?>
                        </div>
                        <div class="item"><span class="label">Departure time:</span>
                            <?php
                            $departureTime = '--';
                            if (isset($pickdrop) && is_array($pickdrop) && isset($ticket->drop_stand_id)) {
                                foreach ($pickdrop as $pickvalue) {
                                    if (isset($pickvalue->pickdropid) && $pickvalue->pickdropid == $ticket->drop_stand_id) {
                                        $dropupTime = isset($pickvalue->time) ? $pickvalue->time : '';
                                        if ($dropupTime !== '') {
                                            $dropupDateTime = DateTime::createFromFormat('h:i A', $dropupTime);
                                            if ($dropupDateTime) {
                                                $dropupDateTime->modify('+15 minutes');
                                                $departureTime = $dropupDateTime->format('h:i A');
                                            } else {
                                                $departureTime = $dropupTime;
                                            }
                                        }
                                        break;
                                    }
                                }
                            }
                            echo $departureTime;
                            ?>
                        </div>
                        <div class="item"><span class="label">Seat No:</span> <?php echo $ticket->seatnumber; ?></div>
                        <div class="item"><span class="label">Total Fare(Tk):</span> <?php echo number_format($ticket->paidamount, 2); ?></div>
                        <div class="item"><span class="label">From:</span> <?php echo $from; ?></div>
                        <div class="item"><span class="label">To:</span> <?php echo $to; ?></div>
                        <div class="item"><span class="label">Mobile:</span> <?php echo $ticket->login_mobile; ?></div>
                        <div class="item"><span class="label">Issued On:</span> <?php echo date('d M Y h:iA', strtotime($ticket->created_at)); ?></div>
                    </div>
                    <div class="ticket-footer"><?php echo $copyType; ?></div>
                </div>
            <?php endif; ?>
        <?php endforeach; ?>
    </div>
    <script>
        window.onload = function() {
            window.print();
        };
    </script>
</body>
</html>
